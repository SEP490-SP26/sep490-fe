'use client'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

// Fix for default marker icon in Leaflet with webpack
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

export interface AddressResult {
  lat: number
  lng: number
  formattedAddress: string
  displayName?: string
}

interface AddressMapPickerProps {
  value?: AddressResult
  onChange?: (address: AddressResult) => void
  height?: number | string
  defaultCenter?: [number, number]
  placeholder?: string
}

// Component to handle map clicks
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Component to recenter map
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom())
  }, [lat, lng, map])
  return null
}

export default function AddressMapPicker({
  value,
  onChange,
  height = 300,
  defaultCenter = [21.028511, 105.804817], // Hanoi
  placeholder = 'Tìm kiếm địa chỉ...',
}: AddressMapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    value ? [value.lat, value.lng] : null
  )
  const [address, setAddress] = useState(value?.formattedAddress || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Reverse geocoding using Nominatim
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`
        )
        const data = await response.json()
        const formattedAddress = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        setAddress(formattedAddress)

        if (onChange) {
          onChange({
            lat,
            lng,
            formattedAddress,
            displayName: data.display_name,
          })
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error)
        const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        setAddress(fallbackAddress)
        if (onChange) {
          onChange({ lat, lng, formattedAddress: fallbackAddress })
        }
      }
    },
    [onChange]
  )

  // Handle map click
  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng])
      reverseGeocode(lat, lng)
    },
    [reverseGeocode]
  )

  // Search address using Nominatim
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=vn&limit=5&accept-language=vi`
      )
      const data = await response.json()
      setSearchResults(data)
      setShowResults(true)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchAddress(searchQuery)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, searchAddress])

  // Select search result
  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    setPosition([lat, lng])
    setAddress(result.display_name)
    setSearchQuery('')
    setShowResults(false)
    setSearchResults([])

    if (onChange) {
      onChange({
        lat,
        lng,
        formattedAddress: result.display_name,
        displayName: result.display_name,
      })
    }
  }

  return (
    <div className='address-map-picker'>
      {/* Search Input */}
      <div className='relative mb-2'>
        <input
          type='text'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        />
        {isSearching && (
          <div className='absolute right-3 top-1/2 -translate-y-1/2'>
            <div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
          </div>
        )}

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className='absolute z-[1000] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
            {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => selectSearchResult(result)}
                className='px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0'
              >
                <div className='text-sm text-gray-800'>{result.display_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div style={{ height, width: '100%' }} className='rounded-lg overflow-hidden border border-gray-300'>
        <MapContainer
          center={position || defaultCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          {position && (
            <>
              <Marker position={position} />
              <MapRecenter lat={position[0]} lng={position[1]} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Selected Address Display */}
      {address && (
        <div className='mt-2 p-2 bg-green-50 border border-green-200 rounded-lg'>
          <div className='text-xs text-gray-500 mb-1'>Địa chỉ đã chọn:</div>
          <div className='text-sm text-green-800 font-medium'>{address}</div>
        </div>
      )}

      {/* Click hint */}
      {!position && (
        <div className='mt-2 text-xs text-gray-400 text-center'>
          💡 Click vào bản đồ để chọn vị trí hoặc tìm kiếm địa chỉ ở trên
        </div>
      )}
    </div>
  )
}
