import { UploadOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Checkbox, Col, Form, Modal, Row, Upload, UploadFile, Image as AntImage } from "antd";
import { RcFile } from "antd/es/upload";
import { useState } from "react";
import { Vibrant } from 'node-vibrant/browser';

interface DesignUploadSectionProps {
  designFilePath: string | null;
  isSendDesign: boolean;
  setIsSendDesign: (val: boolean) => void;
  fileList: UploadFile[];
  setFileList: (files: UploadFile[] | ((prev: UploadFile[]) => UploadFile[])) => void;
  onColorsExtracted?: (colors: string[]) => void;
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
  isSendDesign,
  setIsSendDesign,
  fileList,
  setFileList,
  onColorsExtracted,
}: DesignUploadSectionProps) {

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64((file.originFileObj || file) as RcFile);
    }

    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
    setPreviewTitle(file.name || file.url!.substring(file.url!.lastIndexOf('/') + 1));
  };

  const extractColors = (imageUrl: string) => {
    try {
        Vibrant.from(imageUrl).getPalette().then((palette: any) => {
            if (palette) {
                const colors: string[] = [];
                const addColor = (swatch: any) => {
                    if (swatch) colors.push(swatch.hex);
                };
                addColor(palette.Vibrant);
                addColor(palette.LightVibrant);
                addColor(palette.DarkVibrant);
                addColor(palette.Muted);
                addColor(palette.LightMuted);
                addColor(palette.DarkMuted);
                setExtractedColors(colors);
                if (onColorsExtracted) {
                    onColorsExtracted(colors);
                }
            }
        }).catch((err: any) => {
            console.error("Lỗi trích xuất màu:", err);
        });
    } catch (e) {
      console.error("Lỗi khi trích xuất màu:", e);
    }
  };

  // Handle manual upload/removal logic in parent via fileList
  const handleBeforeUpload = (file: RcFile) => {
    // Add to list but don't upload yet
    // Generate a temporary thumbUrl for better UX immediately
    const newFile = file as UploadFile;
    const objectUrl = URL.createObjectURL(file);
    newFile.thumbUrl = objectUrl;

    if (file.type.startsWith('image/')) {
        extractColors(objectUrl);
    }

    setFileList((prev) => [...prev, newFile]);
    return false; // Prevent automatic upload
  };

  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter((item) => item.uid !== file.uid);
    setFileList(newFileList);
    if (newFileList.filter(f => f.type?.startsWith('image/')).length === 0) {
        setExtractedColors([]);
    }
  };

  return (
    <Row gutter={16}>
      <Col span={24}>
        {designFilePath ? (
          <Form.Item label="File Thiết Kế" className="mb-2">
            <div className="flex flex-col gap-3">
              {/* Show previously uploaded files if any (from API, usually passed via designFilePath string) */}
              {designFilePath && (
                <div className=" rounded text-sm text-gray-500">
                  {/* <div className="font-semibold mb-2">File đã có trên hệ thống:</div> */}
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
                  
                  {extractedColors.length > 0 && (
                    <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-100">
                        <div className="text-sm font-semibold mb-2 text-gray-700">Màu sắc nổi bật từ thiết kế (Gợi ý chọn mực):</div>
                        <div className="flex flex-wrap gap-3">
                        {extractedColors.map((hex, i) => {
                            return (
                            <div key={i} className="flex flex-col items-center gap-1 group">
                                <div 
                                className="w-8 h-8 rounded-full shadow-sm border border-gray-300 transition-transform group-hover:scale-110"
                                style={{ backgroundColor: hex }}
                                title={hex}
                                />
                                <span className="text-[10px] text-gray-500 uppercase">{hex}</span>
                            </div>
                            );
                        })}
                        </div>
                    </div>
                  )}

                  <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={handleCancel}>
                    <img alt="example" style={{ width: '100%' }} src={previewImage} />
                  </Modal>
                </>
              )}
            </div>
          </Form.Item>
        )}

      </Col>
    </Row>
  );
}
