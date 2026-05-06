/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import AddressMapPicker, { AddressResult } from '@/components/AddressMapPicker'
import { useCustomer } from '@/context/CustomerContext'
import { useProduction } from '@/context/ProductionContext'
import { EnvironmentOutlined, EyeOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import {
    Button,
    Card,
    Col,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Result,
    Row,
    Select,
    Typography,
    Upload
} from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import authApiRequest from '@/apiRequests/auth'

const { Title, Text } = Typography

export default function CustomerOrderPage() {
  const [form] = Form.useForm()
  // const { addOrder } = useProduction()
  const { customer, isLoggedIn, isLoading, getDefaultAddress } = useCustomer()
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isSuccess, setIsSuccess] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')

  // Address state
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [newMapAddress, setNewMapAddress] = useState<AddressResult | undefined>(undefined)

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login')
    }
  }, [isLoading, isLoggedIn, router])

  // Pre-fill customer info and default address
  useEffect(() => {
    const fetchUserData = async () => {
      if (isAuthenticated && user?.user_id) {
        try {
          const res = await authApiRequest.getUserById(user.user_id);
          const userData = (res as any)?.data || res;
          
          if (userData) {
            form.setFieldsValue({
              customerName: userData.full_name || user.full_name,
              phone: userData.phone_number || '',
              email: userData.email || '',
            });
          }
        } catch (error) {
          console.error("Fetch user error", error);
        }
      } else if (customer) {
        form.setFieldsValue({
          customerName: customer.name,
          phone: customer.phone,
          email: customer.email,
        })
      }

      // Set default address
      const defaultAddr = getDefaultAddress()
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id)
      }
    };
    
    fetchUserData();
  }, [customer, form, getDefaultAddress, isAuthenticated, user])

  const normFile = (e: any) => {
    if (Array.isArray(e)) return e
    return e?.fileList
  }

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File)
    }
    setPreviewImage(file.url || (file.preview as string))
    setPreviewOpen(true)
    setPreviewTitle(file.name || 'Preview')
  }

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  // Get selected address details
  const getSelectedAddress = () => {
    if (!customer?.addresses || !selectedAddressId) return null
    return customer.addresses.find((a) => a.id === selectedAddressId)
  }

  const onFinish = (values: any) => {
    let shippingAddress = ''
    
    if (useNewAddress) {
      shippingAddress = newMapAddress?.formattedAddress || values.shippingAddress || 'Chưa có địa chỉ'
    } else {
      const addr = getSelectedAddress()
      if (addr) {
        shippingAddress = addr.formattedAddress || `${addr.streetAddress}, ${addr.districtName}, ${addr.provinceName}`
      }
    }

    const fakeFileUrl = values.designFile?.[0]
      ? `https://storage.cloud.com/${values.designFile[0].name}`
      : ''

    // addOrder({
    //   product_id: 'custom',
    //   product_name: values.productName,
    //   customer_name: values.customerName,
    //   customer_phone: values.phone,
    //   customer_email: values.email,
    //   quantity: values.quantity,
    //   delivery_date: values.desiredDate?.format('YYYY-MM-DD') || '',
    //   design_file_url: fakeFileUrl,
    //   note: `Địa chỉ giao hàng: ${shippingAddress}. ${values.note || ''}`,
    //   specs: {
    //     width: 0,
    //     height: 0,
    //     length: 0,
    //     paper_id: '',
    //     colors: [],
    //     processing: [],
    //   },
    // })

    setIsSuccess(true)
  }

  if (isLoading || !customer) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-gray-500'>Đang tải...</div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className='flex justify-center items-center min-h-screen bg-gray-50 p-4'>
        <Card className='w-full max-w-2xl shadow-md'>
          <Result
            status='success'
            title='Đặt Hàng Thành Công!'
            subTitle='Chúng tôi đã nhận được thông tin. Tư vấn viên sẽ liên hệ lại.'
            extra={[
              <Button
                type='primary'
                size='large'
                key='back'
                onClick={() => {
                  setIsSuccess(false)
                  form.resetFields()
                  form.setFieldsValue({
                    customerName: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                  })
                  setFileList([])
                }}
              >
                Đặt đơn khác
              </Button>,
              <Link href='/customer/profile' key='profile'>
                <Button size='large'>Xem lịch sử đơn hàng</Button>
              </Link>,
            ]}
          />
        </Card>
      </div>
    )
  }

  const labelStyle = 'font-semibold text-gray-700'

  return (
    <div className='min-h-screen bg-gray-100 py-8 px-4'>
      <div className='max-w-6xl mx-auto'>
        <div className='text-center mb-8'>
          <Title level={2} style={{ color: '#1677ff', textTransform: 'uppercase' }}>
            Đặt In Nhanh
          </Title>
          <Text type='secondary'>
            Xin chào <strong>{customer.name}</strong>! Thông tin của bạn đã được điền sẵn.
          </Text>
        </div>

        <Card className='shadow-xl rounded-2xl'>
          <Form
            form={form}
            layout='vertical'
            onFinish={onFinish}
            size='middle'
            requiredMark={false}
            className='compact-form'
          >
            <Row gutter={24}>
              {/* Left Column: Contact Info */}
              <Col xs={24} lg={12}>
                <div className='border-r border-gray-200 pr-8 lg:border-r'>
                  <Title level={4} className='text-blue-700 mb-6'>
                    <EnvironmentOutlined className='mr-2' />
                    Thông tin liên hệ & Giao hàng
                  </Title>

                  <Form.Item
                    name='customerName'
                    label={<span className={labelStyle}>Họ và tên</span>}
                  >
                    <Input disabled className='bg-gray-50' />
                  </Form.Item>

                  <Form.Item
                    name='phone'
                    label={<span className={labelStyle}>Số điện thoại</span>}
                  >
                    <Input disabled className='bg-gray-50' />
                  </Form.Item>

                  <Form.Item
                    name='email'
                    label={<span className={labelStyle}>Email</span>}
                  >
                    <Input disabled className='bg-gray-50' />
                  </Form.Item>

                  {/* Address Selection */}
                  <div className='mt-6 pt-4 border-t'>
                    <div className='flex justify-between items-center mb-3'>
                      <span className={labelStyle}>Địa chỉ giao hàng</span>
                      <Button
                        type='link'
                        size='small'
                        onClick={() => setUseNewAddress(!useNewAddress)}
                      >
                        {useNewAddress ? 'Chọn địa chỉ đã lưu' : 'Nhập địa chỉ mới'}
                      </Button>
                    </div>

                    {!useNewAddress ? (
                      // Select from saved addresses
                      <>
                        {customer.addresses && customer.addresses.length > 0 ? (
                          <Select
                            className='w-full'
                            value={selectedAddressId}
                            onChange={setSelectedAddressId}
                            placeholder='Chọn địa chỉ giao hàng'
                          >
                            {customer.addresses.map((addr) => (
                              <Select.Option key={addr.id} value={addr.id}>
                                <div className='flex items-center'>
                                  <span className='font-medium'>{addr.label}</span>
                                  {addr.isDefault && (
                                    <span className='ml-2 text-xs text-blue-500'>(Mặc định)</span>
                                  )}
                                  <span className='ml-2 text-gray-500 text-sm truncate'>
                                    - {addr.streetAddress}
                                  </span>
                                </div>
                              </Select.Option>
                            ))}
                          </Select>
                        ) : (
                          <div className='text-gray-500 text-sm'>
                            Chưa có địa chỉ nào.{' '}
                            <Link href='/customer/profile' className='text-blue-600'>
                              Thêm địa chỉ
                            </Link>
                          </div>
                        )}

                        {/* Show selected address details */}
                        {getSelectedAddress() && (
                          <div className='mt-3 p-3 bg-blue-50 rounded-lg text-sm'>
                            <div className='font-medium'>{getSelectedAddress()?.label}</div>
                            <div className='text-gray-600'>
                              {getSelectedAddress()?.streetAddress}
                            </div>
                            <div className='text-gray-500'>
                              {getSelectedAddress()?.districtName}, {getSelectedAddress()?.provinceName}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      // Enter new address with Map Picker
                      <>
                        <AddressMapPicker
                          value={newMapAddress}
                          onChange={(address) => {
                            setNewMapAddress(address)
                            form.setFieldValue('shippingAddress', address.formattedAddress)
                          }}
                          height={250}
                          placeholder='Tìm kiếm địa chỉ...'
                        />
                        <Form.Item name='shippingAddress' hidden>
                          <Input />
                        </Form.Item>
                      </>
                    )}
                  </div>
                </div>
              </Col>

              {/* Right Column: Order Info */}
              <Col xs={24} lg={12}>
                <Title level={4} className='text-blue-700 mb-6'>
                  <PlusOutlined className='mr-2' />
                  Yêu cầu in ấn
                </Title>

                <Form.Item
                  name='productName'
                  label={<span className={labelStyle}>Tên sản phẩm cần in</span>}
                  rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}
                >
                  <Input placeholder='VD: Hộp bánh trung thu, Catalogue, Tờ rơi...' />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name='quantity'
                      label={<span className={labelStyle}>Số lượng dự kiến</span>}
                      rules={[{ required: true, message: 'Nhập số lượng' }]}
                    >
                      <InputNumber
                        className='w-full'
                        min={1}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        placeholder='VD: 1,000'
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name='desiredDate'
                      label={<span className={labelStyle}>Ngày mong muốn nhận hàng</span>}
                      rules={[{ required: true, message: 'Chọn ngày' }]}
                    >
                      <DatePicker className='w-full' format='DD/MM/YYYY' placeholder='Chọn ngày' />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name='note'
                  label={<span className={labelStyle}>Mô tả thêm</span>}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder='Kích thước, chất liệu, yêu cầu đặc biệt...'
                  />
                </Form.Item>

                <Form.Item
                  label={<span className={labelStyle}>File thiết kế mẫu</span>}
                  name='designFile'
                  valuePropName='fileList'
                  getValueFromEvent={normFile}
                >
                  <Upload.Dragger
                    name='files'
                    action='https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188'
                    listType='picture'
                    maxCount={5}
                    multiple
                    fileList={fileList}
                    onChange={({ fileList }) => setFileList(fileList)}
                    onPreview={handlePreview}
                    className='bg-white design-upload-success'
                    showUploadList={{
                      showPreviewIcon: true,
                      previewIcon: <EyeOutlined className='text-blue-500' />,
                    }}
                  >
                    <p className='ant-upload-drag-icon'>
                      <InboxOutlined style={{ color: '#1677ff', fontSize: '28px' }} />
                    </p>
                    <p className='ant-upload-text text-sm'>Kéo thả hoặc click để tải lên</p>
                    <p className='ant-upload-hint text-xs'>PDF, AI, JPG, PNG (Max 10MB)</p>
                  </Upload.Dragger>
                </Form.Item>
              </Col>
            </Row>

            <div className='mt-6 pt-6 border-t'>
              <Button
                type='primary'
                htmlType='submit'
                block
                size='large'
                className='h-14 text-xl font-bold bg-blue-600 hover:bg-blue-700'
              >
                GỬI YÊU CẦU BÁO GIÁ
              </Button>
            </div>
          </Form>
        </Card>
      </div>

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <img alt='preview' style={{ width: '100%' }} src={previewImage} />
      </Modal>

      <style jsx global>{`
        .design-upload-success .ant-upload-list-item-name {
          color: #16a34a !important;
        }
        .design-upload-success .ant-upload-list-item {
          border-color: #bbf7d0 !important;
        }
        .design-upload-success .ant-upload-list-item::before {
          display: none;
        }
        .compact-form .ant-form-item {
          margin-bottom: 12px;
        }
        .compact-form .ant-form-item-label {
          padding-bottom: 4px;
        }
      `}</style>
    </div>
  )
}
