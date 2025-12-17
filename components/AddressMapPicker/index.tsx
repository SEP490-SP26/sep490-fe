'use client'

import { Spin } from 'antd'
import dynamic from 'next/dynamic'

// Dynamic import with no SSR for Leaflet (it requires window object)
const AddressMapPicker = dynamic(
  () => import('./AddressMapPicker'),
  {
    ssr: false,
    loading: () => (
      <div className='flex items-center justify-center h-[300px] bg-gray-100 rounded-lg'>
        <Spin tip='Đang tải bản đồ...' />
      </div>
    ),
  }
)

export default AddressMapPicker
export type { AddressResult } from './AddressMapPicker'
