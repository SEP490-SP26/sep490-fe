'use client'

import { ShippingAddress, useCustomer } from '@/context/CustomerContext'
import { Order, useProduction } from '@/context/ProductionContext'
import { getDistrictsByProvince, VIETNAM_PROVINCES } from '@/utils/vietnamLocations'
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    EnvironmentOutlined,
    EyeOutlined,
    HistoryOutlined,
    HomeOutlined,
    LogoutOutlined,
    MailOutlined,
    PhoneOutlined,
    PlusOutlined,
    SafetyOutlined,
    SaveOutlined,
    StarFilled,
    StarOutlined,
    SyncOutlined,
    UserOutlined,
} from '@ant-design/icons'
import {
    Avatar,
    Button,
    Card,
    Descriptions,
    Empty,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Select,
    Table,
    Tabs,
    Tag,
    Typography,
} from 'antd'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

export default function CustomerProfilePage() {
  const {
    customer,
    isLoggedIn,
    isLoading,
    updateProfile,
    logout,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useCustomer()
  const { orders } = useProduction()
  const router = useRouter()
  const [form] = Form.useForm()
  const [addressForm] = Form.useForm()

  const [isEditing, setIsEditing] = useState(false)
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Address modal state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string>('')

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login')
    }
  }, [isLoading, isLoggedIn, router])

  // Load customer orders
  useEffect(() => {
    if (customer?.phone) {
      const foundOrders = orders
        .filter((o) => o.customer_phone === customer.phone)
        .sort(
          (a, b) =>
            new Date(b.created_at || '').getTime() -
            new Date(a.created_at || '').getTime()
        )
      setMyOrders(foundOrders)
    }
  }, [customer, orders])

  // Set form values when customer data loads
  useEffect(() => {
    if (customer) {
      form.setFieldsValue({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      })
    }
  }, [customer, form])

  const handleLogout = () => {
    Modal.confirm({
      title: 'Đăng xuất',
      content: 'Bạn có chắc chắn muốn đăng xuất?',
      okText: 'Đăng xuất',
      cancelText: 'Hủy',
      onOk: () => {
        logout()
        message.success('Đã đăng xuất thành công')
        router.push('/')
      },
    })
  }

  const handleSaveProfile = (values: any) => {
    updateProfile({
      name: values.name,
      email: values.email,
    })
    setIsEditing(false)
    message.success('Cập nhật thông tin thành công!')
  }

  // Address handlers
  const openAddAddressModal = () => {
    setEditingAddress(null)
    addressForm.resetFields()
    setSelectedProvince('')
    setIsAddressModalOpen(true)
  }

  const openEditAddressModal = (address: ShippingAddress) => {
    setEditingAddress(address)
    setSelectedProvince(address.provinceCode)
    addressForm.setFieldsValue({
      label: address.label,
      provinceCode: address.provinceCode,
      districtCode: address.districtCode,
      streetAddress: address.streetAddress,
    })
    setIsAddressModalOpen(true)
  }

  const handleAddressSubmit = (values: any) => {
    const province = VIETNAM_PROVINCES.find((p) => p.code === values.provinceCode)
    const district = province?.districts.find((d) => d.code === values.districtCode)

    const addressData = {
      label: values.label,
      provinceCode: values.provinceCode,
      provinceName: province?.name || '',
      districtCode: values.districtCode,
      districtName: district?.name || '',
      streetAddress: values.streetAddress,
      isDefault: editingAddress ? editingAddress.isDefault : false,
    }

    if (editingAddress) {
      updateAddress(editingAddress.id, addressData)
      message.success('Cập nhật địa chỉ thành công!')
    } else {
      addAddress(addressData)
      message.success('Thêm địa chỉ mới thành công!')
    }

    setIsAddressModalOpen(false)
    addressForm.resetFields()
  }

  const handleDeleteAddress = (addressId: string) => {
    deleteAddress(addressId)
    message.success('Đã xóa địa chỉ!')
  }

  const handleSetDefault = (addressId: string) => {
    setDefaultAddress(addressId)
    message.success('Đã đặt làm địa chỉ mặc định!')
  }

  const renderStatus = (status: string) => {
    switch (status) {
      case 'pending_consultant':
        return <Tag icon={<ClockCircleOutlined />} color='blue'>Chờ Tư Vấn</Tag>
      case 'consultant_verified':
        return <Tag icon={<UserOutlined />} color='orange'>Đang Xử Lý</Tag>
      case 'manager_approved':
        return <Tag icon={<SyncOutlined spin />} color='cyan'>Đang Sản Xuất</Tag>
      case 'in_production':
        return <Tag icon={<SyncOutlined spin />} color='purple'>Đang In Ấn</Tag>
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color='green'>Hoàn Thành</Tag>
      case 'rejected':
        return <Tag icon={<CloseCircleOutlined />} color='red'>Đã Hủy</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const orderColumns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => (
        <span className='font-mono text-gray-500'>#{text.split('-')[1]}</span>
      ),
    },
    {
      title: 'Sản Phẩm',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text: string) => (
        <span className='font-medium text-blue-700'>{text || 'Chưa xác định'}</span>
      ),
    },
    {
      title: 'Ngày Đặt',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'process_status',
      key: 'process_status',
      render: (val: string, record: Order) =>
        renderStatus(record.status === 'in_production' ? 'in_production' : val),
    },
    {
      title: '',
      key: 'action',
      render: (_: any, record: Order) => (
        <Button
          type='link'
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedOrder(record)
            setIsDetailOpen(true)
          }}
        >
          Xem
        </Button>
      ),
    },
  ]

  if (isLoading || !customer) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-gray-500'>Đang tải...</div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8 px-4'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-4'>
            <Avatar size={64} icon={<UserOutlined />} className='bg-blue-600' />
            <div>
              <Title level={3} className='mb-0'>
                {customer.name}
              </Title>
              <Text type='secondary'>{customer.phone}</Text>
            </div>
          </div>
          <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>

        {/* Tabs */}
        <Card className='shadow-lg rounded-xl'>
          <Tabs
            defaultActiveKey='info'
            items={[
              {
                key: 'info',
                label: (
                  <span>
                    <UserOutlined /> Thông tin cá nhân
                  </span>
                ),
                children: (
                  <div>
                    <Form
                      form={form}
                      layout='vertical'
                      onFinish={handleSaveProfile}
                      disabled={!isEditing}
                    >
                      <Form.Item
                        name='name'
                        label='Họ và tên'
                        rules={[{ required: true }]}
                      >
                        <Input prefix={<UserOutlined />} />
                      </Form.Item>

                      <Form.Item
                        name='email'
                        label='Email'
                        rules={[{ type: 'email' }]}
                      >
                        <Input prefix={<MailOutlined />} />
                      </Form.Item>

                      <Form.Item name='phone' label='Số điện thoại'>
                        <Input prefix={<PhoneOutlined />} disabled />
                      </Form.Item>

                      <div className='flex gap-2'>
                        {!isEditing ? (
                          <Button
                            type='primary'
                            icon={<EditOutlined />}
                            onClick={() => setIsEditing(true)}
                          >
                            Chỉnh sửa
                          </Button>
                        ) : (
                          <>
                            <Button
                              type='primary'
                              icon={<SaveOutlined />}
                              htmlType='submit'
                            >
                              Lưu thay đổi
                            </Button>
                            <Button onClick={() => setIsEditing(false)}>
                              Hủy
                            </Button>
                          </>
                        )}
                      </div>
                    </Form>

                    <div className='mt-6 pt-6 border-t'>
                      <Text type='secondary'>
                        Ngày đăng ký: {dayjs(customer.createdAt).format('DD/MM/YYYY')}
                      </Text>
                    </div>
                  </div>
                ),
              },
              {
                key: 'addresses',
                label: (
                  <span>
                    <EnvironmentOutlined /> Địa chỉ giao hàng
                  </span>
                ),
                children: (
                  <div>
                    <div className='flex justify-between items-center mb-4'>
                      <Text type='secondary'>
                        {customer.addresses?.length || 0} địa chỉ đã lưu
                      </Text>
                      <Button
                        type='primary'
                        icon={<PlusOutlined />}
                        onClick={openAddAddressModal}
                      >
                        Thêm địa chỉ mới
                      </Button>
                    </div>

                    {(!customer.addresses || customer.addresses.length === 0) ? (
                      <Empty description='Chưa có địa chỉ nào' />
                    ) : (
                      <div className='space-y-3'>
                        {customer.addresses.map((addr) => (
                          <Card
                            key={addr.id}
                            size='small'
                            className={`${addr.isDefault ? 'border-blue-400 bg-blue-50' : ''}`}
                          >
                            <div className='flex justify-between items-start'>
                              <div className='flex-1'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <HomeOutlined className='text-gray-500' />
                                  <span className='font-medium'>{addr.label}</span>
                                  {addr.isDefault && (
                                    <Tag color='blue' className='ml-2'>
                                      <StarFilled className='mr-1' />
                                      Mặc định
                                    </Tag>
                                  )}
                                </div>
                                <div className='text-gray-600 text-sm'>
                                  {addr.streetAddress}
                                </div>
                                <div className='text-gray-500 text-sm'>
                                  {addr.districtName}, {addr.provinceName}
                                </div>
                              </div>
                              <div className='flex gap-1'>
                                {!addr.isDefault && (
                                  <Button
                                    size='small'
                                    type='text'
                                    icon={<StarOutlined />}
                                    onClick={() => handleSetDefault(addr.id)}
                                    title='Đặt làm mặc định'
                                  />
                                )}
                                <Button
                                  size='small'
                                  type='text'
                                  icon={<EditOutlined />}
                                  onClick={() => openEditAddressModal(addr)}
                                />
                                <Popconfirm
                                  title='Xóa địa chỉ này?'
                                  onConfirm={() => handleDeleteAddress(addr.id)}
                                >
                                  <Button
                                    size='small'
                                    type='text'
                                    danger
                                    icon={<DeleteOutlined />}
                                  />
                                </Popconfirm>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'history',
                label: (
                  <span>
                    <HistoryOutlined /> Lịch sử đơn hàng
                  </span>
                ),
                children: (
                  <div>
                    <div className='flex justify-between items-center mb-4'>
                      <Text type='secondary'>
                        Tổng cộng {myOrders.length} đơn hàng
                      </Text>
                      <Link href='/customer/order'>
                        <Button type='primary'>Đặt đơn mới</Button>
                      </Link>
                    </div>

                    <Table
                      columns={orderColumns}
                      dataSource={myOrders}
                      rowKey='id'
                      pagination={{ pageSize: 5 }}
                      locale={{
                        emptyText: <Empty description='Chưa có đơn hàng nào' />,
                      }}
                    />
                  </div>
                ),
              },
              {
                key: 'security',
                label: (
                  <span>
                    <SafetyOutlined /> Bảo mật
                  </span>
                ),
                children: (
                  <div className='space-y-6'>
                    <div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
                      <div className='flex items-center gap-2 mb-2'>
                        <CheckCircleOutlined className='text-green-500' />
                        <span className='font-medium text-green-700'>
                          Số điện thoại đã xác minh
                        </span>
                      </div>
                      <Text type='secondary'>{customer.phone}</Text>
                    </div>

                    <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                      <Title level={5}>Xác thực hai yếu tố</Title>
                      <Text type='secondary'>
                        Tài khoản của bạn được bảo vệ bằng OTP qua số điện thoại.
                      </Text>
                    </div>

                    <Button danger onClick={handleLogout} icon={<LogoutOutlined />}>
                      Đăng xuất khỏi tất cả thiết bị
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* Add/Edit Address Modal */}
        <Modal
          title={editingAddress ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
          open={isAddressModalOpen}
          onCancel={() => setIsAddressModalOpen(false)}
          footer={null}
          width={500}
        >
          <Form
            form={addressForm}
            layout='vertical'
            onFinish={handleAddressSubmit}
          >
            <Form.Item
              name='label'
              label='Tên địa chỉ'
              rules={[{ required: true, message: 'Nhập tên địa chỉ' }]}
            >
              <Input placeholder='VD: Nhà riêng, Công ty, Văn phòng...' />
            </Form.Item>

            <Form.Item
              name='provinceCode'
              label='Tỉnh/Thành phố'
              rules={[{ required: true, message: 'Chọn tỉnh/thành' }]}
            >
              <Select
                placeholder='Chọn tỉnh/thành phố'
                showSearch
                optionFilterProp='label'
                options={VIETNAM_PROVINCES.map((p) => ({
                  value: p.code,
                  label: p.name,
                }))}
                onChange={(value) => {
                  setSelectedProvince(value)
                  addressForm.setFieldValue('districtCode', undefined)
                }}
              />
            </Form.Item>

            <Form.Item
              name='districtCode'
              label='Quận/Huyện'
              rules={[{ required: true, message: 'Chọn quận/huyện' }]}
            >
              <Select
                placeholder='Chọn quận/huyện'
                showSearch
                optionFilterProp='label'
                disabled={!selectedProvince}
                options={getDistrictsByProvince(selectedProvince).map((d) => ({
                  value: d.code,
                  label: d.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              name='streetAddress'
              label='Địa chỉ chi tiết'
              rules={[{ required: true, message: 'Nhập địa chỉ' }]}
            >
              <Input.TextArea
                rows={2}
                placeholder='Số nhà, tên đường, phường/xã...'
              />
            </Form.Item>

            <div className='flex justify-end gap-2'>
              <Button onClick={() => setIsAddressModalOpen(false)}>Hủy</Button>
              <Button type='primary' htmlType='submit'>
                {editingAddress ? 'Cập nhật' : 'Thêm địa chỉ'}
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Order Detail Modal */}
        <Modal
          title='Chi Tiết Đơn Hàng'
          open={isDetailOpen}
          onCancel={() => setIsDetailOpen(false)}
          footer={[
            <Button key='close' type='primary' onClick={() => setIsDetailOpen(false)}>
              Đóng
            </Button>,
          ]}
          width={600}
        >
          {selectedOrder && (
            <div className='space-y-4'>
              <div className='bg-blue-50 p-4 rounded-lg flex justify-between items-center'>
                <div>
                  <div className='text-xs text-gray-500'>Trạng thái</div>
                  <div className='mt-1'>{renderStatus(selectedOrder.process_status)}</div>
                </div>
                <div className='text-right'>
                  <div className='text-xs text-gray-500'>Mã đơn</div>
                  <div className='font-mono font-bold'>
                    #{selectedOrder.id.split('-')[1]}
                  </div>
                </div>
              </div>

              <Descriptions bordered column={1} size='small'>
                <Descriptions.Item label='Sản phẩm'>
                  <b className='text-blue-700'>{selectedOrder.product_name}</b>
                </Descriptions.Item>
                <Descriptions.Item label='Số lượng'>
                  {selectedOrder.quantity?.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label='Ngày đặt'>
                  {dayjs(selectedOrder.created_at).format('HH:mm - DD/MM/YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label='Ngày giao dự kiến'>
                  {selectedOrder.delivery_date
                    ? dayjs(selectedOrder.delivery_date).format('DD/MM/YYYY')
                    : 'Đang cập nhật'}
                </Descriptions.Item>
                {selectedOrder.final_price && (
                  <Descriptions.Item label='Tổng giá trị'>
                    <span className='font-bold text-red-600'>
                      {selectedOrder.final_price.toLocaleString()} ₫
                    </span>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label='Ghi chú'>
                  {selectedOrder.note || 'Không có'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}
