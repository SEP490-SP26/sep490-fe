import { UploadOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Checkbox, Col, Form, Modal, Row, Upload, UploadFile, Image as AntImage } from "antd";
import { RcFile } from "antd/es/upload";
import { useState } from "react";

interface DesignUploadSectionProps {
  designFilePath: string | null;
  // setDesignFilePath: (url: string | null) => void;
  // We keep the old props for compatibility if needed, but primarily we depend on fileList now for new files
  isSendDesign: boolean;
  setIsSendDesign: (val: boolean) => void;
  fileList: UploadFile[];
  setFileList: (files: UploadFile[] | ((prev: UploadFile[]) => UploadFile[])) => void;
}

const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export default function DesignUploadSection({
  designFilePath,
  // setDesignFilePath,
  isSendDesign,
  setIsSendDesign,
  fileList,
  setFileList,
}: DesignUploadSectionProps) {

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64((file.originFileObj || file) as RcFile);
    }

    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
    setPreviewTitle(file.name || file.url!.substring(file.url!.lastIndexOf('/') + 1));
  };

  // Handle manual upload/removal logic in parent via fileList
  const handleBeforeUpload = (file: RcFile) => {
    // Add to list but don't upload yet
    // Generate a temporary thumbUrl for better UX immediately
    const newFile = file as UploadFile;
    newFile.thumbUrl = URL.createObjectURL(file);

    setFileList((prev) => [...prev, newFile]);
    return false; // Prevent automatic upload
  };

  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
  };

  return (
    <Row gutter={16}>
      <Col span={24}>
        {designFilePath ? (
          <Form.Item label="File Thiết Kế" className="mb-2">
            <div className="flex flex-col gap-3">
              Khách hàng đã gửi file thiết kế

              {/* Show previously uploaded files if any (from API, usually passed via designFilePath string) */}
              {designFilePath && (
                <div className=" rounded text-sm text-gray-500">
                  <div className="font-semibold mb-2">File đã có trên hệ thống:</div>
                  <div className="flex flex-wrap gap-2">
                    {designFilePath.split(',').map((url, index) => {
                      const trimmedUrl = url.trim();
                      // Simple check for image extensions, can be improved
                      const isImage = /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(trimmedUrl);

                      if (isImage) {
                        return (
                          <div key={index} className="border rounded overflow-hidden" style={{ width: 80, height: 80 }}>
                            <AntImage
                              src={trimmedUrl}
                              alt={`Design file ${index + 1}`}
                              width={80}
                              height={80}
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                        );
                      } else {
                        // For non-image files, show a link or icon
                        return (
                          <div key={index} className="flex items-center justify-center border rounded bg-white p-2" style={{ width: 80, height: 80 }}>
                            <a href={trimmedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all text-xs text-center">
                              File {index + 1}
                            </a>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
          </Form.Item>
        ) : (
          <Form.Item label="File Thiết Kế" className="mb-2">
            <div className="flex flex-col gap-3">
              <Checkbox
                checked={!isSendDesign}
                onChange={(e) => setIsSendDesign(!e.target.checked)}
              >
                Khách hàng dùng file thiết kế của công ty
              </Checkbox>

              {!isSendDesign && (
                <>
                  <Upload
                    multiple
                    listType="picture-card"
                    fileList={fileList}
                    beforeUpload={handleBeforeUpload}
                    onRemove={handleRemove}
                    onPreview={handlePreview}
                    accept="image/*,.pdf,.zip,.rar"
                  >
                    <button style={{ border: 0, background: 'none' }} type="button">
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Chọn file</div>
                    </button>
                  </Upload>
                  <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={handleCancel}>
                    <img alt="example" style={{ width: '100%' }} src={previewImage} />
                  </Modal>
                </>
              )}

              {/* Show previously uploaded files if any (from API, usually passed via designFilePath string) */}
              {/* {designFilePath && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-500">
                <div className="font-semibold">File đã có trên hệ thống:</div>
                <div className="break-all">{designFilePath}</div>
              </div>
            )} */}
            </div>
          </Form.Item>
        )}

      </Col>
    </Row>
  );
}
