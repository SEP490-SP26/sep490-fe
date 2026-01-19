
import { Button, Col, Form, Image as AntImage, message, Row, Upload, Checkbox } from "antd";
import { DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import { uploadApi } from "@/apiRequests/uploads";

interface DesignUploadSectionProps {
  designFilePath: string | null;
  setDesignFilePath: (url: string | null) => void;
  orderId: string | null;
  isSendDesign: boolean;
  setIsSendDesign: (val: boolean) => void;
}

export default function DesignUploadSection({
  designFilePath,
  setDesignFilePath,
  orderId,
  isSendDesign,
  setIsSendDesign,
}: DesignUploadSectionProps) {
  return (
    <Row gutter={16}>
      <Col span={16}>
        <Form.Item label="File Thiết Kế" className="mb-2">
          {designFilePath ? (
            <div className="flex items-center gap-2">
              <AntImage
                src={designFilePath}
                alt="File thiết kế"
                width={60}
                height={60}
                className="rounded border object-cover"
                preview={{
                  cover: <span className="text-xs">Xem</span>,
                }}
              />
              <h1>File thiết kế đã được khách hàng tải lên</h1>
            </div>
          ) : (
            <div>
              <Checkbox
                checked={!isSendDesign}
                onChange={(e) => setIsSendDesign(!e.target.checked)}
              >
                Khách hàng dùng file thiết kế của công ty
              </Checkbox>
            </div>
            // <Upload
            //   showUploadList={false}
            //   beforeUpload={async (file) => {
            //     try {
            //       message.loading({
            //         content: "Đang tải lên...",
            //         key: "upload",
            //       });
            //       const response = await uploadApi.uploadFile(file);
            //       if (response?.url) {
            //         setDesignFilePath(response.url);
            //         message.success({
            //           content: "Tải file thành công!",
            //           key: "upload",
            //         });
            //       }
            //     } catch (error) {
            //       console.error("Upload error:", error);
            //       message.error({
            //         content: "Tải file thất bại!",
            //         key: "upload",
            //       });
            //     }
            //     return false;
            //   }}
            //   accept="image/*,.pdf"
            // >
            //   {/* Button upload can be customized if needed */}
            //   <Button size="small">Chọn file</Button>
            // </Upload>
          )}
        </Form.Item>
      </Col>
    </Row>
  );
}
