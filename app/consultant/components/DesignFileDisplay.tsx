"use client";

import {
    FileImageOutlined,
    DownloadOutlined,
} from "@ant-design/icons";
import {
    Image as AntImage,
    Button,
    Typography,
    Tooltip,
} from "antd";

const { Text } = Typography;

interface DesignFileDisplayProps {
    designFilePath?: string;
    requestId: string | number;
}

export default function DesignFileDisplay({ designFilePath, requestId }: DesignFileDisplayProps) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 ">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                    <FileImageOutlined className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 m-0">File thiết kế</h3>
            </div>

            {/* Current Design File Display */}
            <div className="mb-6">
                {designFilePath ? (
                    <div className="space-y-4">
                        {designFilePath.split(',').filter(url => url.trim()).map((url, index) => {
                            const cleanUrl = url.trim();
                            const fileName = cleanUrl.split('/').pop() || `Design_${requestId}_${index + 1}`;
                            return (
                                <div key={index} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 transition-all hover:border-cyan-300">
                                    <div className="flex items-center justify-center">
                                        <AntImage
                                            src={cleanUrl}
                                            alt={`Design file ${index + 1}`}
                                            className="w-full object-contain bg-slate-100"
                                            style={{ height: 300, width: '100%' }}
                                            fallback="https://placehold.co/600x400?text=No+Preview"
                                        />
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <Tooltip title="Tải xuống">
                                            <Button shape="circle" icon={<DownloadOutlined />} href={cleanUrl} target="_blank" />
                                        </Tooltip>
                                    </div>
                                    <div className="p-3 bg-white border-t border-slate-100">
                                        <Text ellipsis className="text-slate-500 text-xs block">File thiết kế #{index + 1}</Text>
                                        <Text strong className="text-gray-700 text-sm" ellipsis={{ tooltip: fileName }}>
                                            {fileName}
                                        </Text>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-40 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 mb-4">
                        <FileImageOutlined className="text-3xl mb-2 opacity-50" />
                        <span className="text-sm">Chưa có file thiết kế</span>
                    </div>
                )}
            </div>
        </div>
    );
}
