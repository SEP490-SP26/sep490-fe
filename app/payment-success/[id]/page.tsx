'use client'
import { useEffect, useState } from 'react';
import { Check, Package, User, FileText, TrendingUp, Calendar, MapPin, Phone, Mail, Banknote, Download, Eye, X } from 'lucide-react';
import { useParams } from 'next/navigation';

interface OrderDetail {
  order_id: number;
  code: string;
  status: string;
  payment_status: string;
  order_date: string;
  delivery_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  detail_address: string;
  product_name: string;
  quantity: number;
  production_start_date: string;
  production_end_date: string;
  final_total_cost: number;
  deposit_amount: number;
  rush_amount: number;
  quote_fields: {
    paper_name: string;
    coating_type: string;
    wave_type: string;
    design_type: string;
    production_process: string;
    material_cost: number;
    labor_cost: number;
    other_fees: number;
    rush_amount: number;
  };
}

interface CostEstimate {
  estimate_id: number;
  material_cost: number;
  paper_cost: number;
  ink_cost: number;
  coating_glue_cost: number;
  lamination_cost: number;
  design_cost: number;
  subtotal: number;
  rush_amount: number;
  discount_amount: number;
  final_total_cost: number;
  deposit_amount: number;
  paper_name: string;
  wave_type: string;
  coating_type: string;
  sheets_total: number;
  total_area_m2: number;
}

export default function PaymentSuccess() {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payosData, setPayosData] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const params = useParams();
  const orderId = params.id;

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    if (phone.length <= 4) return phone;
    return "xxxx" + phone.slice(-4);
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [name, domain] = parts;
    if (name.length <= 3) return `xxx@${domain}`;
    return `xxxx${name.slice(-3)}@${domain}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderRes, estimateRes] = await Promise.all([
          fetch(`https://mmes-sep490-84gr.onrender.com/api/Orders/detail/${orderId}`),
          fetch(`https://mmes-sep490-84gr.onrender.com/api/Requests/get-cost-estimate/${orderId}`),
          //fetch(`https://localhost:7109/api/Orders/detail/${orderId}`),
          //fetch(`https://localhost:7109/api/Requests/get-cost-estimate/${orderId}`)
        ]);

        if (!orderRes.ok || !estimateRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const orderData = await orderRes.json();
        const estimateData = await estimateRes.json();

        setOrder(orderData);
        setEstimate(estimateData);

        try {
          const payosRes = await fetch(`https://mmes-sep490-84gr.onrender.com/api/Orders/create-payos-remaining-link/${orderId}`);
          if (payosRes.ok) {
            const pData = await payosRes.json();
            setPayosData(pData);
            if (pData.order_code) {
              setReceiptUrl(`https://mmes-sep490-84gr.onrender.com/api/Payments/payment-receipt-docx/${pData.order_code}`);
            }
          }
        } catch (e) {
          console.error("Failed to fetch payos remaining link", e);
        }
      } catch (err) {
        setError('Không thể tải thông tin đơn hàng');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !order || !estimate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy đơn hàng</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const remainingAmount = order.final_total_cost - order.deposit_amount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-green-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl shadow-2xl p-8 mb-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Check className="w-12 h-12 text-green-500" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">Thanh toán thành công!</h1>
          <p className="text-center text-green-50 text-lg mb-4">
            Cảm ơn quý khách đã tin tưởng sử dụng dịch vụ của chúng tôi
          </p>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
            <p className="text-sm text-green-50 mb-1">Mã đơn hàng</p>
            <p className="text-2xl font-bold">{order.code}</p>
            <p className="text-sm text-green-50 mt-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Đặt hàng: {formatDate(order.order_date)}
            </p>
            <p className="text-sm text-green-50 mt-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Ngày giao dự kiến: {formatDate(order.delivery_date)}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Thông tin sản phẩm</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Sản phẩm</span>
                <span className="font-semibold text-slate-800">{order.product_name}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Số lượng</span>
                <span className="font-semibold text-slate-800">{order.quantity} hộp</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Loại giấy</span>
                <span className="font-semibold text-slate-800">{order.quote_fields.paper_name}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Sóng</span>
                <span className="font-semibold text-slate-800 text-sm">{order.quote_fields.wave_type === "N/A" ? "Không có" : order.quote_fields.wave_type}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Phủ bề mặt</span>
                <span className="font-semibold text-slate-800">{order.quote_fields.coating_type === "N/A" ? "Không có" : order.quote_fields.coating_type}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-slate-600">Trạng thái</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'Finished' ? 'bg-green-100 text-green-700' :
                  order.status === 'Processing' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                  {order.status === "Delivery" ? "Đang giao hàng" : order.status === "Paid" ? "Chờ bàn giao vận chuyển" : order.status === "Completed" ? "Đã nhận hàng" : "Đã thanh toán"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Thông tin khách hàng</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start py-3 border-b border-slate-100">
                <User className="w-5 h-5 text-slate-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Họ và tên</p>
                  <p className="font-semibold text-slate-800">{order.customer_name}</p>
                </div>
              </div>
              <div className="flex items-start py-3 border-b border-slate-100">
                <Phone className="w-5 h-5 text-slate-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Số điện thoại</p>
                  <p className="font-semibold text-slate-800">{maskPhone(order.customer_phone)}</p>
                </div>
              </div>
              <div className="flex items-start py-3 border-b border-slate-100">
                <Mail className="w-5 h-5 text-slate-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-semibold text-slate-800">{maskEmail(order.customer_email)}</p>
                </div>
              </div>
              <div className="flex items-start py-3">
                <MapPin className="w-5 h-5 text-slate-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Địa chỉ giao hàng</p>
                  <p className="font-semibold text-slate-800">{order.detail_address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
              <Banknote className="w-6 h-6 text-slate-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Chi tiết chi phí</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 mb-4 pb-2 border-b">Chi phí nguyên vật liệu</h3>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Giấy ({estimate.sheets_total} tờ)</span>
                <span className="font-semibold">{formatVND(estimate.paper_cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Mực in</span>
                <span className="font-semibold">{formatVND(estimate.ink_cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Keo phủ</span>
                <span className="font-semibold">{formatVND(estimate.coating_glue_cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Cán màng</span>
                <span className="font-semibold">{formatVND(estimate.lamination_cost)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-slate-700 font-medium">Tổng vật liệu</span>
                <span className="font-bold text-blue-600">{formatVND(estimate.material_cost)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 mb-4 pb-2 border-b">Chi phí khác</h3>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Chi phí thiết kế</span>
                <span className="font-semibold">{formatVND(estimate.design_cost)}</span>
              </div>
              {order.rush_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Phí gia công gấp</span>
                  <span className="font-semibold text-orange-600">{formatVND(order.rush_amount)}</span>
                </div>
              )}
              {estimate.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Giảm giá</span>
                  <span className="font-semibold text-green-600">-{formatVND(estimate.discount_amount)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-slate-200">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600 mb-1">Tổng cộng</p>
                <p className="text-2xl font-bold text-slate-800">{formatVND(order.final_total_cost)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-slate-600 mb-1">Đã thanh toán (Cọc)</p>
                <p className="text-2xl font-bold text-blue-600">{formatVND(order.deposit_amount)}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-sm text-slate-600 mb-1">Còn lại (đã thanh toán)</p>
                <p className="text-2xl font-bold text-orange-600">{formatVND(remainingAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {receiptUrl && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 transform transition-all duration-300 hover:shadow-xl border border-indigo-50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4 shadow-sm">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Biên lai thanh toán</h2>
                  <p className="text-sm text-slate-500">Mã giao dịch: {payosData?.order_code}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors font-medium border border-indigo-100 shadow-sm"
                >
                  <Eye className="w-4 h-4" />
                  Xem trước
                </button>
                <a
                  href={receiptUrl}
                  download
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Tải xuống
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Về trang chủ
          </button>
        </div>

      </div>

      {/* Preview Modal */}
      {isPreviewOpen && receiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Xem trước biên lai
              </h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(receiptUrl)}`}
                className="w-full h-full border-0"
                title="Biên lai thanh toán"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
