'use client'

import { estimatesApi } from '@/apiRequests/estimates'
import {
  CheckCircleOutlined,
  UploadOutlined
} from '@ant-design/icons'
import {
  Button,
  Card,
  message,
  Typography,
  Upload
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

const { Title, Text } = Typography

function UploadContractContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const requestId = params.id as string;
  const estimateId = searchParams.get('estimateId') || searchParams.get('estimate_id');

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpload = async () => {
    if (!requestId || !estimateId) {
      message.error("Đường dẫn không hợp lệ. Thiếu thông tin mã yêu cầu hoặc mã báo giá.");
      return;
    }

    if (fileList.length === 0) {
      message.warning("Vui lòng chọn file hợp đồng để tải lên");
      return;
    }

    const file = fileList[0].originFileObj as File;

    if (!file) {
      message.error("Lỗi file không hợp lệ");
      return;
    }

    try {
      setLoading(true);
      await estimatesApi.uploadCustomerSignedContract({
        request_id: Number(requestId),
        estimate_id: Number(estimateId),
        file: file
      });
      message.success("Tải lên hợp đồng thành công!");
      setIsSuccess(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || "Tải lên thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      const isValidFormat = file.type === 'application/pdf' || file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isValidFormat) {
        message.error('Bạn chỉ có thể tải lên file PDF hoặc hình ảnh (JPG/PNG)!');
        return Upload.LIST_IGNORE;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File phải nhỏ hơn 10MB!');
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false; // Prevent automatic upload
    },
    fileList,
    maxCount: 1,
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-gray-200 rounded-full opacity-30 animate-pulse" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 left-10 w-40 h-40 bg-zinc-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Card className="max-w-md w-full shadow-2xl rounded-xl border-t-4 border-green-500 text-center relative z-10">
          <CheckCircleOutlined className="text-6xl text-green-500 mb-4" />
          <Title level={3} className="text-gray-800 mb-2">Tải lên thành công!</Title>
          <Text className="text-gray-600 block mb-6">
            Hợp đồng của bạn đã được tải lên thành công. Chúng tôi sẽ xem xét và phản hồi trong thời gian sớm nhất.
          </Text>
          <Button type="primary" size="large" onClick={() => router.push('/')} className="w-full h-12 text-lg font-medium rounded-lg">
            Về trang chủ
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-gray-200 rounded-full opacity-30 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-10 w-40 h-40 bg-zinc-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Title level={2} style={{ color: '#1677ff', textTransform: 'uppercase' }}>
            Tải Lên Lại Hợp Đồng
          </Title>
          <Text style={{ color: 'white' }}>
            Vui lòng đính kèm bản hợp đồng đã ký của bạn
          </Text>
        </div>

        <Card className="shadow-lg rounded-xl border-t-4 border-blue-500">
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center gap-3">
            <div>
              <Text type="secondary" className="block text-xs uppercase font-semibold">Mã yêu cầu: {requestId || "---"}</Text>
              <Text type="secondary" className="block text-xs uppercase font-semibold mt-1">Mã báo giá: {estimateId || "---"}</Text>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File hợp đồng <span className="text-red-500">*</span>
              </label>
              <Upload.Dragger {...uploadProps} className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                <p className="ant-upload-drag-icon text-blue-500">
                  <UploadOutlined className="text-4xl" />
                </p>
                <p className="ant-upload-text font-medium mt-2">Nhấn hoặc kéo thả file vào khu vực này</p>
                <p className="ant-upload-hint text-gray-500 text-sm px-4 mt-1">
                  Hỗ trợ định dạng PDF, JPG, PNG. Chấp nhận 1 file duy nhất với dung lượng tối đa 10MB.
                </p>
              </Upload.Dragger>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              size="large"
              className="flex-1 rounded-lg"
              onClick={() => router.push("/")}
            >
              Hủy bỏ
            </Button>
            <Button
              size="large"
              type="primary"
              className="flex-1 rounded-lg"
              icon={<UploadOutlined />}
              disabled={fileList.length === 0}
              loading={loading}
              onClick={handleUpload}
            >
              Tải lên ngay
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function UploadContractPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-primary-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <UploadContractContent />
    </Suspense>
  );
}
