'use client'

import { useProduction } from '@/context/ProductionContext'
import { auth } from '@/utils/firebaseConfig'
import { getDistrictsByProvince, VIETNAM_PROVINCES } from '@/utils/vietnamLocations'
import { CheckCircleOutlined, EnvironmentOutlined, EyeOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Result,
  Row,
  Select,
  Typography,
  Upload,
} from 'antd'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

declare global {
  interface Window {
    recaptchaVerifier: any
    confirmationResult: any
  }
}

export default function GuestOrderPage() {
  const [form] = Form.useForm()
  const { addOrder } = useProduction()
  const [isSuccess, setIsSuccess] = useState(false)

  // OTP state
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loadingOtp, setLoadingOtp] = useState(false)

  // File upload state
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')

  // Address state
  const [selectedProvince, setSelectedProvince] = useState<string>('')

  // Setup reCAPTCHA
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {},
      })
    }

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
    }
  }, [])

  // OTP handlers
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const onSendOtp = async () => {
    const phoneNumber = form.getFieldValue('phone')
    if (!phoneNumber) {
      message.error('Vui lòng nhập số điện thoại!')
      return
    }

    const formatPh = '+84' + phoneNumber.replace(/^0/, '')
    setLoadingOtp(true)

    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formatPh,
        window.recaptchaVerifier
      )
      window.confirmationResult = confirmationResult
      setIsOtpSent(true)
      message.success('Mã OTP đã được gửi!')
    } catch (error) {
      console.error(error)
      message.error('Gửi OTP thất bại. Vui lòng thử lại.')
    } finally {
      setLoadingOtp(false)
    }
  }

  const onVerifyOtp = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      message.error('Vui lòng nhập đủ 6 số OTP!')
      return
    }
    setLoadingOtp(true)
    try {
      await window.confirmationResult.confirm(otpCode)
      setIsVerified(true)
      setIsOtpSent(false)
      message.success('Xác thực thành công!')
    } catch (err) {
      console.error(err)
      message.error('Mã OTP không đúng!')
    } finally {
      setLoadingOtp(false)
    }
  }

  // File handlers
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

  const onFinish = (values: any) => {
    const province = VIETNAM_PROVINCES.find((p) => p.code === values.provinceCode)
    const district = province?.districts.find((d) => d.code === values.districtCode)
    const shippingAddress = `${values.streetAddress}, ${district?.name}, ${province?.name}`

    const fakeFileUrl = values.designFile?.[0]
      ? `https://storage.cloud.com/${values.designFile[0].name}`
      : ''

    addOrder({
      product_id: 'custom',
      product_name: values.productName,
      customer_name: values.customerName,
      customer_phone: values.phone,
      customer_email: values.email,
      quantity: values.quantity,
      delivery_date: values.desiredDate?.format('YYYY-MM-DD') || '',
      design_file_url: fakeFileUrl,
      note: `Địa chỉ giao hàng: ${shippingAddress}. ${values.note || ''}`,
      specs: {
        width: 0,
        height: 0,
        length: 0,
        paper_id: '',
        colors: [],
        processing: [],
      },
    })

    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className='flex justify-center items-center min-h-screen bg-gray-50 p-4'>
        <Card className='w-full max-w-2xl shadow-md'>
          <Result
            status='success'
            title='Đặt Hàng Thành Công!'
            subTitle='Nhân viên tư vấn sẽ liên hệ lại với bạn sớm.'
            extra={[
              <Button
                type='primary'
                size='large'
                key='back'
                onClick={() => {
                  setIsSuccess(false)
                  form.resetFields()
                  setIsVerified(false)
                  setIsOtpSent(false)
                  setOtp(['', '', '', '', '', ''])
                  setFileList([])
                  setSelectedProvince('')
                }}
              >
                Đặt đơn khác
              </Button>,
              <Link href='/customer/history' key='history'>
                <Button size='large'>Tra cứu đơn hàng</Button>
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
      <div id='recaptcha-container'></div>

      <div className='max-w-6xl mx-auto'>
        <div className='text-center mb-8'>
          <Title level={2} style={{ color: '#1677ff', textTransform: 'uppercase' }}>
            Đặt In Nhanh
          </Title>
          <Text type='secondary'>
            Điền thông tin để nhận báo giá từ đội ngũ tư vấn
          </Text>
          <div className='mt-2'>
            <Text type='secondary'>
              Đã có tài khoản?{' '}
              <Link href='/login' className='text-blue-600 font-medium'>
                Đăng nhập để đặt hàng nhanh hơn
              </Link>
            </Text>
          </div>
        </div>

        <Card className='shadow-xl rounded-2xl'>
          <Form
            form={form}
            layout='vertical'
            onFinish={onFinish}
            size='middle'
            requiredMark='optional'
            className='compact-form'
          >
            <Row gutter={24}>
              {/* Left Column: Contact Info */}
              <Col xs={24} lg={12}>
                <div className='lg:border-r border-gray-200 lg:pr-8'>
                  <Title level={4} className='text-blue-700 mb-6'>
                    <EnvironmentOutlined className='mr-2' />
                    Thông tin liên hệ & Giao hàng
                  </Title>

                  <Form.Item
                    name='customerName'
                    label={<span className={labelStyle}>Họ và tên</span>}
                    rules={[{ required: true, message: 'Nhập họ tên' }]}
                  >
                    <Input placeholder='Nguyễn Văn A' />
                  </Form.Item>

                  <Form.Item
                    name='phone'
                    label={<span className={labelStyle}>Số điện thoại</span>}
                    rules={[
                      { required: true, message: 'Nhập SĐT' },
                      { pattern: /^0\d{9}$/, message: 'SĐT không hợp lệ' },
                    ]}
                  >
                    <Input
                      placeholder='0912345678'
                      disabled={isOtpSent || isVerified}
                      suffix={isVerified ? <CheckCircleOutlined className='text-green-500' /> : null}
                    />
                  </Form.Item>

                  {/* OTP Section */}
                  {!isVerified && (
                    <div className='mb-4'>
                      {!isOtpSent ? (
                        <Button type='default' onClick={onSendOtp} loading={loadingOtp}>
                          Gửi mã xác thực (OTP)
                        </Button>
                      ) : (
                        <div className='space-y-3'>
                          <div className='flex justify-center gap-2'>
                            {otp.map((digit, index) => (
                              <input
                                key={index}
                                id={`otp-${index}`}
                                type='text'
                                inputMode='numeric'
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                className='w-10 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none'
                              />
                            ))}
                          </div>
                          <div className='flex gap-2'>
                            <Button type='primary' onClick={onVerifyOtp} loading={loadingOtp} className='flex-1'>
                              Xác nhận
                            </Button>
                            <Button
                              type='link'
                              danger
                              onClick={() => {
                                setIsOtpSent(false)
                                setOtp(['', '', '', '', '', ''])
                              }}
                            >
                              Gửi lại
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isVerified && (
                    <div className='mb-4 p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm'>
                      <CheckCircleOutlined className='mr-1' /> SĐT đã xác minh
                    </div>
                  )}

                  <Form.Item
                    name='email'
                    label={<span className={labelStyle}>Email</span>}
                    rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
                  >
                    <Input placeholder='email@example.com' />
                  </Form.Item>

                  {/* Shipping Address */}
                  <div className='pt-4 border-t'>
                    <div className={`${labelStyle} mb-3`}>Địa chỉ giao hàng</div>

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
                          form.setFieldValue('districtCode', undefined)
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
                      <Input placeholder='Số nhà, tên đường, phường/xã...' />
                    </Form.Item>
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

                <Form.Item
                  name='desiredDate'
                  label={<span className={labelStyle}>Ngày mong muốn nhận hàng</span>}
                  rules={[{ required: true, message: 'Chọn ngày' }]}
                >
                  <DatePicker className='w-full' format='DD/MM/YYYY' placeholder='Chọn ngày' />
                </Form.Item>

                <Form.Item
                  name='note'
                  label={<span className={labelStyle}>Mô tả thêm</span>}
                >
                  <Input.TextArea rows={3} placeholder='Kích thước, chất liệu, yêu cầu đặc biệt...' />
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
                disabled={!isVerified}
                className={`h-14 text-xl font-bold ${!isVerified ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                GỬI YÊU CẦU BÁO GIÁ
              </Button>
              {!isVerified && (
                <div className='text-center text-red-500 mt-2 text-sm'>
                  Vui lòng xác thực SĐT để gửi đơn
                </div>
              )}
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
