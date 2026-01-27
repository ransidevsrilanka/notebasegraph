import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Printer,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  CreditCard,
  Building2,
  Truck,
  Package,
  Clock,
  XCircle,
  Plus,
  Upload,
  Copy,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

// PayHere types
interface PrintPayHerePayment {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  custom_1?: string;
  custom_2?: string;
}

interface PrintSettings {
  notes_price_per_page: number;
  model_paper_price_per_page: number;
  base_delivery_fee: number;
  cod_extra_fee: number;
}

interface Paper {
  id: string;
  title: string;
  page_count: number;
  topic_id: string;
}

interface BankSettings {
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch_name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

interface PrintOrder {
  id: string;
  request_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  subject_name: string;
  print_type: string;
  tracking_number: string | null;
  created_at: string;
}

interface OrderDetails {
  fullName: string;
  address: string;
  phone: string;
  city: string;
  selectedSubject: string;
  selectedTopics: string[];
  selectedPapers: string[];
  allTopics: boolean;
  totalPages: number;
  subjectName: string;
  totalAmount: number;
  deliveryFee: number;
  estimatedPrice: number;
}

interface PrintRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentMethod = 'card' | 'bank_transfer' | 'cod';
type ViewMode = 'orders' | 'new_request';

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10',
  confirmed: 'border-blue-500/50 text-blue-500 bg-blue-500/10',
  processing: 'border-purple-500/50 text-purple-500 bg-purple-500/10',
  shipped: 'border-orange-500/50 text-orange-500 bg-orange-500/10',
  delivered: 'border-green-500/50 text-green-500 bg-green-500/10',
  cancelled: 'border-red-500/50 text-red-500 bg-red-500/10',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  confirmed: <CheckCircle2 className="w-3 h-3" />,
  processing: <Package className="w-3 h-3" />,
  shipped: <Truck className="w-3 h-3" />,
  delivered: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'processing', 'shipped'];
const COMPLETED_STATUSES = ['delivered', 'cancelled'];

const PrintRequestDialog = ({ open, onOpenChange }: PrintRequestDialogProps) => {
  const { user, profile, enrollment, userSubjects } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs to store order details for card payment callback
  const orderDetailsRef = useRef<OrderDetails | null>(null);
  const orderIdRef = useRef<string>('');
  
  // Existing orders
  const [existingOrders, setExistingOrders] = useState<PrintOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<PrintSettings | null>(null);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  
  // Step 1: Subject & Topics & Papers
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState(false);
  
  // Step 2: Delivery Info
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  
  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  
  // Bank Transfer Flow
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  // COD confirmation
  const [codConfirmed, setCodConfirmed] = useState(false);
  
  // Auto-calculated total pages from selected papers
  const totalPages = papers
    .filter(p => selectedPapers.includes(p.id))
    .reduce((sum, p) => sum + (p.page_count || 1), 0);
  
  // Filter orders
  const activeOrders = existingOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = existingOrders.filter(o => COMPLETED_STATUSES.includes(o.status));
  const displayedOrders = showHistory ? completedOrders : activeOrders;
  
  // Load orders, settings and subjects on mount
  useEffect(() => {
    if (open && user) {
      loadExistingOrders();
      loadSettings();
      loadBankSettings();
      loadSubjects();
      // Pre-fill from profile
      if (profile?.full_name) setFullName(profile.full_name);
      const profileAny = profile as any;
      if (profileAny?.phone) setPhone(profileAny.phone);
    }
  }, [open, user, profile]);
  
  // Load topics when subject changes
  useEffect(() => {
    if (selectedSubject) {
      loadTopics(selectedSubject);
      setSelectedTopics([]);
      setSelectedPapers([]);
      setPapers([]);
    }
  }, [selectedSubject]);
  
  // Load papers when topics change
  useEffect(() => {
    if (selectedTopics.length > 0 || allTopics) {
      const topicIds = allTopics ? topics.map(t => t.id) : selectedTopics;
      if (topicIds.length > 0) {
        loadPapers(topicIds);
      }
    } else {
      setPapers([]);
      setSelectedPapers([]);
    }
  }, [selectedTopics, allTopics, topics]);
  
  const loadExistingOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    
    const { data, error } = await supabase
      .from('print_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setExistingOrders(data as PrintOrder[]);
    }
    setLoadingOrders(false);
  };
  
  const loadSettings = async () => {
    const { data } = await supabase
      .from('print_settings')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (data) {
      setSettings(data as PrintSettings);
    }
  };
  
  const loadBankSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'bank_details')
      .single();
    
    if (data?.value && typeof data.value === 'object') {
      const bankData = data.value as Record<string, string>;
      setBankSettings({
        bank_name: bankData.bank_name || 'Commercial Bank',
        account_number: bankData.account_number || '',
        account_holder: bankData.account_holder || '',
        branch_name: bankData.branch_name || '',
      });
    } else {
      setBankSettings({
        bank_name: 'Commercial Bank',
        account_number: '1234567890',
        account_holder: 'Notebase',
        branch_name: 'Main Branch',
      });
    }
  };
  
  const loadSubjects = async () => {
    if (!enrollment) {
      console.log('No enrollment found for subjects loading');
      return;
    }
    
    // Get user's locked subjects if any (only if is_locked is true)
    const userSubjectsAny = userSubjects as any;
    const isLocked = userSubjectsAny?.is_locked === true;
    const subjectNames = isLocked ? [
      userSubjects?.subject_1,
      userSubjects?.subject_2,
      userSubjects?.subject_3,
    ].filter(Boolean) as string[] : [];
    
    console.log('Loading subjects for:', { 
      grade: enrollment.grade, 
      medium: enrollment.medium, 
      stream: enrollment.stream,
      isLocked,
      lockedSubjects: subjectNames 
    });
    
    let subjectsFound: Subject[] = [];
    
    // Strategy 1: Try subjects table with grade + medium filter
    let query = supabase
      .from('subjects')
      .select('id, name, streams')
      .eq('grade', enrollment.grade)
      .eq('medium', enrollment.medium)
      .eq('is_active', true);
    
    // If user has locked subjects, filter by those names only
    if (subjectNames.length > 0) {
      query = query.in('name', subjectNames);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading subjects:', error);
    }
    
    if (data && data.length > 0) {
      // For A/L without locked subjects, filter by stream
      let filteredData = data;
      if (subjectNames.length === 0 && enrollment.stream && !enrollment.grade?.startsWith('ol_')) {
        filteredData = data.filter(s => {
          const streams = (s as any).streams;
          return streams && Array.isArray(streams) && streams.includes(enrollment.stream);
        });
      }
      
      if (filteredData.length > 0) {
        // Deduplicate by name
        const uniqueSubjects = filteredData.filter(
          (subject, index, self) => index === self.findIndex(s => s.name === subject.name)
        );
        subjectsFound = uniqueSubjects.map(s => ({ id: s.id, name: s.name }));
      }
    }
    
    // Strategy 2: Fallback to stream_subjects table if no results
    if (subjectsFound.length === 0) {
      console.log('Falling back to stream_subjects table');
      const stream = enrollment.grade?.startsWith('ol_') ? 'ol' : enrollment.stream;
      
      if (stream) {
        const { data: streamData } = await supabase
          .from('stream_subjects')
          .select('id, subject_name')
          .eq('stream', stream)
          .order('sort_order');
        
        if (streamData && streamData.length > 0) {
          // Filter by locked subjects if user has them
          let filtered = streamData;
          if (subjectNames.length > 0) {
            filtered = streamData.filter(s => subjectNames.includes(s.subject_name));
          }
          subjectsFound = filtered.map(s => ({ id: s.id, name: s.subject_name }));
        }
      }
    }
    
    console.log('Subjects loaded:', subjectsFound.length, subjectsFound);
    setSubjects(subjectsFound);
  };
  
  const loadTopics = async (subjectId: string) => {
    const { data } = await supabase
      .from('topics')
      .select('id, name, subject_id')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .order('sort_order');
    
    if (data) setTopics(data);
  };
  
  const loadPapers = async (topicIds: string[]) => {
    const { data } = await supabase
      .from('notes')
      .select('id, title, page_count, topic_id')
      .in('topic_id', topicIds)
      .eq('is_model_paper', true)
      .eq('is_active', true)
      .order('title');
    
    if (data) {
      setPapers(data as Paper[]);
      // Auto-select all papers by default
      setSelectedPapers(data.map(p => p.id));
    }
  };
  
  // Load PayHere SDK
  const loadPayHereScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.payhere) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.payhere.lk/lib/payhere.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load PayHere SDK"));
      document.body.appendChild(script);
    });
  };
  
  const generateReferenceNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'PR-';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const calculateTotal = () => {
    if (!settings) return 0;
    
    const pricePerPage = settings.model_paper_price_per_page;
    const itemsTotal = totalPages * pricePerPage;
    const deliveryFee = settings.base_delivery_fee;
    const codFee = paymentMethod === 'cod' ? settings.cod_extra_fee : 0;
    
    return itemsTotal + deliveryFee + codFee;
  };
  
  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  /**
   * CARD PAYMENT FLOW - Deferred print request creation
   * The print request is ONLY created after payment succeeds
   */
  const initiateCardPayment = async (orderDetails: OrderDetails) => {
    if (!user || !enrollment) return;
    
    try {
      // Load PayHere SDK
      try {
        await loadPayHereScript();
      } catch (loadError) {
        console.log('First PayHere load attempt failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await loadPayHereScript();
        } catch (retryError) {
          toast.error("Payment system unavailable. Please try again or choose a different method.");
          setIsLoading(false);
          return;
        }
      }
      
      // Generate temporary order ID (no database record yet)
      const tempOrderId = `PR-${Date.now().toString(36).slice(-8).toUpperCase()}`;
      
      // Store order details for callback
      orderDetailsRef.current = orderDetails;
      orderIdRef.current = tempOrderId;
      
      // Call hash generation WITHOUT creating print_request
      const { data, error } = await supabase.functions.invoke('payhere-checkout/generate-hash', {
        body: {
          order_id: tempOrderId,
          items: `Print Request - ${orderDetails.subjectName}`,
          amount: orderDetails.totalAmount,
          currency: 'LKR',
          first_name: fullName.split(' ')[0] || 'Customer',
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          phone: phone,
          address: address,
          city: city || 'Colombo',
          country: 'Sri Lanka',
          // Pass order details to be stored on backend for later use
          print_order_details: JSON.stringify(orderDetails),
        }
      });
      
      if (error) {
        console.error('PayHere checkout error:', error);
        toast.error('Failed to initiate payment. Please try again or choose a different method.');
        setIsLoading(false);
        return;
      }
      
      const notifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payhere-checkout/notify`;
      const returnUrl = `${window.location.origin}/dashboard?print_payment=success`;
      const cancelUrl = `${window.location.origin}/dashboard?print_payment=cancelled`;
      
      // Set up PayHere callbacks
      window.payhere.onCompleted = async (orderId: string) => {
        console.log("Card payment completed. OrderID:", orderId);
        
        // NOW create the print request via edge function (payment confirmed)
        const details = orderDetailsRef.current;
        if (!details) {
          toast.error("Order details not found. Please contact support.");
          return;
        }
        
        try {
          const { data: result, error: createError } = await supabase.functions.invoke('payhere-checkout/finalize-print-request', {
            body: {
              order_id: orderId,
              user_id: user.id,
              order_details: details,
            }
          });
          
          if (!createError && result?.success) {
            toast.success("Payment successful! Your print order is confirmed.");
            loadExistingOrders();
            resetForm();
            setViewMode('orders');
          } else {
            console.error('Failed to create print request:', createError);
            toast.error("Payment received but order creation failed. Please contact support with order ID: " + orderId);
          }
        } catch (err) {
          console.error('Error finalizing print request:', err);
          toast.error("Payment received but order creation failed. Please contact support.");
        }
        
        setIsLoading(false);
      };
      
      window.payhere.onDismissed = () => {
        console.log("Payment dismissed by user");
        toast.info("Payment cancelled");
        setIsLoading(false);
        // NO orphan record created!
      };
      
      window.payhere.onError = (error: string) => {
        console.error("PayHere SDK error:", error);
        toast.error(`Payment failed: ${error}`);
        setIsLoading(false);
        // NO orphan record created!
      };
      
      // Create payment object for popup
      const payment: PrintPayHerePayment = {
        sandbox: data.sandbox || false,
        merchant_id: data.merchant_id,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        order_id: data.order_id,
        items: `Print Request - ${orderDetails.subjectName}`,
        amount: orderDetails.totalAmount.toFixed(2),
        currency: "LKR",
        hash: data.hash,
        first_name: fullName.split(' ')[0] || 'Customer',
        last_name: fullName.split(' ').slice(1).join(' ') || 'User',
        email: user.email || '',
        phone: phone,
        address: address,
        city: city || 'Colombo',
        country: "Sri Lanka",
        custom_1: 'print_request_pending',
        custom_2: `print_pending_${tempOrderId}`,
      };
      
      // Close dialog first, then open PayHere popup
      onOpenChange(false);
      setTimeout(() => {
        window.payhere.startPayment(payment as any);
      }, 100);
      
    } catch (err: any) {
      console.error('Card payment error:', err);
      toast.error('Failed to process payment. Please try again or choose a different method.');
      setIsLoading(false);
    }
  };
  
  /**
   * Main submit handler
   * - For CARD payments: Opens PayHere popup, creates record ONLY after payment succeeds
   * - For BANK_TRANSFER/COD: Creates record immediately (requires manual admin verification)
   */
  const handleSubmit = async () => {
    if (!user || !enrollment) return;
    
    // Validate file type for bank transfer
    if (paymentMethod === 'bank_transfer' && receiptFile) {
      const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
      if (!ALLOWED_TYPES.includes(receiptFile.type)) {
        toast.error('Only PNG, JPG, or PDF files are allowed');
        return;
      }
    }
    
    setIsLoading(true);
    
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name || '';
    
    // Build order details object
    const orderDetails: OrderDetails = {
      fullName,
      address,
      phone,
      city,
      selectedSubject,
      selectedTopics,
      selectedPapers,
      allTopics,
      totalPages,
      subjectName,
      totalAmount: calculateTotal(),
      deliveryFee: settings?.base_delivery_fee || 0,
      estimatedPrice: calculateTotal() - (settings?.base_delivery_fee || 0) - (paymentMethod === 'cod' ? settings?.cod_extra_fee || 0 : 0),
    };
    
    // === CARD PAYMENT: Deferred creation ===
    // Do NOT create database record yet - wait for payment confirmation
    if (paymentMethod === 'card') {
      await initiateCardPayment(orderDetails);
      return;
    }
    
    // === BANK TRANSFER / COD: Immediate creation ===
    // These require manual admin verification anyway
    const requestNumber = referenceNumber || generateReferenceNumber();
    
    const { data: printRequest, error } = await supabase
      .from('print_requests')
      .insert({
        user_id: user.id,
        request_number: requestNumber,
        full_name: fullName,
        address,
        phone,
        city,
        print_type: 'model_papers_only',
        subject_id: selectedSubject,
        subject_name: subjectName,
        topic_ids: allTopics ? [] : selectedTopics,
        estimated_pages: totalPages,
        estimated_price: orderDetails.estimatedPrice,
        delivery_fee: orderDetails.deliveryFee,
        total_amount: orderDetails.totalAmount,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'bank_transfer' ? 'pending_verification' : 'pending',
        status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
        receipt_url: paymentMethod === 'bank_transfer' ? 'sent_to_telegram' : null,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to submit request');
      console.error(error);
      setIsLoading(false);
      return;
    }
    
    // Send Telegram notification ONLY for bank_transfer and COD
    // Card payments send notification after payment confirmation in edge function
    try {
      if (paymentMethod === 'bank_transfer' && receiptFile) {
        // Send receipt as document to Telegram
        const base64 = await fileToBase64(receiptFile);
        const fileExt = receiptFile.name.split('.').pop() || 'jpg';
        
        await supabase.functions.invoke('send-telegram-document', {
          body: {
            type: 'print_request',
            message: `🖨️ Print Request (Bank Transfer)\nRequest: ${requestNumber}\nCustomer: ${fullName}\nSubject: ${subjectName}\nTotal: Rs. ${orderDetails.totalAmount}`,
            file_base64: base64,
            file_name: `print_${requestNumber}.${fileExt}`,
            file_type: receiptFile.type,
            data: {
              request_number: requestNumber,
              customer: fullName,
              phone: phone,
              subject: subjectName,
              payment_method: 'Bank Transfer',
              total: orderDetails.totalAmount
            }
          }
        });
      } else if (paymentMethod === 'cod') {
        // Send text notification for COD only
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            type: 'new_print_request',
            message: `🖨️ Print Request (COD)\nRequest: ${requestNumber}\nCustomer: ${fullName}\nSubject: ${subjectName}\nTotal: Rs. ${orderDetails.totalAmount}`,
            data: {
              request_number: requestNumber,
              customer: fullName,
              phone: phone,
              subject: subjectName,
              payment_method: 'Cash on Delivery',
              total: orderDetails.totalAmount
            },
            priority: 'medium'
          }
        });
      }
      // NOTE: No notification for 'card' here - will be sent after payment confirms in edge function
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
      // Don't fail the request for Telegram errors
    }
    
    // Complete the flow for bank_transfer and cod
    if (paymentMethod === 'bank_transfer') {
      toast.success('Print request submitted! Please wait for verification.');
    } else if (paymentMethod === 'cod') {
      toast.success('Print request submitted! Payment will be collected upon delivery.');
    }
    
    resetForm();
    loadExistingOrders();
    setViewMode('orders');
    setIsLoading(false);
  };
  
  const startNewRequest = () => {
    setViewMode('new_request');
    setStep(1);
    setReferenceNumber(generateReferenceNumber());
  };
  
  const resetForm = () => {
    setStep(1);
    setSelectedSubject('');
    setSelectedTopics([]);
    setSelectedPapers([]);
    setPapers([]);
    setAllTopics(false);
    setAddress('');
    setCity('');
    setPaymentMethod('cod');
    setReceiptFile(null);
    setCodConfirmed(false);
    setReferenceNumber('');
    orderDetailsRef.current = null;
    orderIdRef.current = '';
  };
  
  const canProceed = () => {
    switch (step) {
      case 1: return selectedSubject && (allTopics || selectedTopics.length > 0) && selectedPapers.length > 0 && totalPages > 0;
      case 2: return fullName && address && phone;
      case 3: 
        if (paymentMethod === 'bank_transfer') return receiptFile !== null;
        if (paymentMethod === 'cod') return codConfirmed;
        return true;
      default: return false;
    }
  };
  
  const copyReference = () => {
    navigator.clipboard.writeText(referenceNumber);
    toast.success('Reference number copied!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-brand" />
            {viewMode === 'orders' ? 'Your Print Orders' : 'Request Printouts'}
          </DialogTitle>
          <DialogDescription>
            {viewMode === 'orders' 
              ? 'Track your print orders or request new printouts'
              : 'Get your notes and model papers printed and delivered'
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Orders View */}
        {viewMode === 'orders' && (
          <div className="space-y-4">
            {loadingOrders ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading orders...
              </div>
            ) : (
              <>
                {/* Toggle between Active and History */}
                <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-lg">
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      !showHistory 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Active ({activeOrders.length})
                  </button>
                  <button
                    onClick={() => setShowHistory(true)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                      showHistory 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <History className="w-3 h-3" />
                    History ({completedOrders.length})
                  </button>
                </div>
                
                {displayedOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">
                      {showHistory ? 'No completed orders yet' : 'No active orders'}
                    </p>
                    {!showHistory && (
                      <Button variant="brand" onClick={startNewRequest}>
                        <Plus className="w-4 h-4 mr-2" />
                        Request Printouts
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {displayedOrders.map((order) => (
                        <div key={order.id} className="p-4 border border-border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-medium">{order.request_number}</span>
                            <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>
                              {STATUS_ICONS[order.status]}
                              <span className="ml-1 capitalize">{order.status}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{order.subject_name}</span>
                            <span className="text-foreground font-medium">Rs. {order.total_amount?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="capitalize">{order.print_type.replace(/_/g, ' ')}</span>
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          {order.tracking_number && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-green-500/10 rounded text-sm">
                              <Truck className="w-4 h-4 text-green-500" />
                              <span className="text-green-500">Tracking: {order.tracking_number}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {!showHistory && (
                      <Button variant="brand" onClick={startNewRequest} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        New Request
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
        
        {/* New Request Form */}
        {viewMode === 'new_request' && (
          <>
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-brand text-brand-foreground'
                      : step > s
                        ? 'bg-green-500 text-white'
                        : 'bg-secondary text-muted-foreground'
                  }`}>
                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  {s < 4 && (
                    <div className={`w-8 h-0.5 ${step > s ? 'bg-green-500' : 'bg-secondary'}`} />
                  )}
                </div>
              ))}
            </div>
            
            {/* Step 1: Select Subject & Papers */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="font-medium text-foreground">Select Papers to Print</h3>
                  <p className="text-sm text-muted-foreground">Choose your subject and model papers</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {subjects.length === 0 && (
                      <p className="text-xs text-muted-foreground">No subjects available for your enrollment</p>
                    )}
                  </div>
                  
                  {selectedSubject && topics.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Topics</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="allTopics"
                            checked={allTopics}
                            onCheckedChange={(checked) => {
                              setAllTopics(checked === true);
                              if (checked) setSelectedTopics([]);
                            }}
                          />
                          <label htmlFor="allTopics" className="text-sm text-muted-foreground cursor-pointer">
                            All Topics
                          </label>
                        </div>
                      </div>
                      
                      {!allTopics && (
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                          {topics.map((topic) => (
                            <div key={topic.id} className="flex items-center gap-2">
                              <Checkbox
                                id={topic.id}
                                checked={selectedTopics.includes(topic.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTopics([...selectedTopics, topic.id]);
                                  } else {
                                    setSelectedTopics(selectedTopics.filter(id => id !== topic.id));
                                  }
                                }}
                              />
                              <label htmlFor={topic.id} className="text-sm cursor-pointer truncate">
                                {topic.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {papers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Model Papers ({papers.length})</Label>
                        <span className="text-sm text-muted-foreground">
                          {selectedPapers.length} selected • {totalPages} pages
                        </span>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {papers.map((paper) => (
                          <div key={paper.id} className="flex items-center justify-between p-2 border border-border rounded">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={paper.id}
                                checked={selectedPapers.includes(paper.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPapers([...selectedPapers, paper.id]);
                                  } else {
                                    setSelectedPapers(selectedPapers.filter(id => id !== paper.id));
                                  }
                                }}
                              />
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <label htmlFor={paper.id} className="text-sm cursor-pointer truncate max-w-[200px]">
                                {paper.title}
                              </label>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {paper.page_count || 1} pages
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 2: Delivery Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="font-medium text-foreground">Delivery Information</h3>
                  <p className="text-sm text-muted-foreground">Where should we deliver your printouts?</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Full Name
                    </Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07X XXX XXXX"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Delivery Address
                    </Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full delivery address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 3: Payment Method */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="font-medium text-foreground">Payment Method</h3>
                  <p className="text-sm text-muted-foreground">Choose how you'd like to pay</p>
                </div>
                
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer ${paymentMethod === 'card' ? 'border-brand bg-brand/5' : 'border-border'}`}>
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Card Payment</p>
                        <p className="text-xs text-muted-foreground">Pay securely with Visa/Master</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer ${paymentMethod === 'bank_transfer' ? 'border-brand bg-brand/5' : 'border-border'}`}>
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Building2 className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Bank Transfer</p>
                        <p className="text-xs text-muted-foreground">Transfer and upload receipt</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer ${paymentMethod === 'cod' ? 'border-brand bg-brand/5' : 'border-border'}`}>
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Truck className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when you receive (+Rs.{settings?.cod_extra_fee || 0})</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
                
                {/* Bank Transfer Details */}
                {paymentMethod === 'bank_transfer' && bankSettings && (
                  <div className="mt-4 p-4 bg-secondary/30 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm">Bank Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank:</span>
                        <span>{bankSettings.bank_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account:</span>
                        <span className="font-mono">{bankSettings.account_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span>{bankSettings.account_holder}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Branch:</span>
                        <span>{bankSettings.branch_name}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">Reference:</span>
                        <code className="px-2 py-0.5 bg-background rounded text-sm font-mono">{referenceNumber}</code>
                        <button onClick={copyReference} className="p-1 hover:bg-secondary rounded">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Use this reference when making the transfer</p>
                    </div>
                    
                    <div className="pt-2">
                      <Label className="text-sm mb-2 block">Upload Receipt</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,application/pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="flex-1"
                        />
                        {receiptFile && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* COD Confirmation */}
                {paymentMethod === 'cod' && (
                  <div className="mt-4 p-4 bg-orange-500/10 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="codConfirm"
                        checked={codConfirmed}
                        onCheckedChange={(checked) => setCodConfirmed(checked === true)}
                      />
                      <label htmlFor="codConfirm" className="text-sm cursor-pointer">
                        I understand that I will pay <strong>Rs. {calculateTotal().toLocaleString()}</strong> (including Rs. {settings?.cod_extra_fee || 0} COD fee) when the order is delivered.
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="font-medium text-foreground">Review Order</h3>
                  <p className="text-sm text-muted-foreground">Please confirm your order details</p>
                </div>
                
                <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subject:</span>
                    <span>{subjects.find(s => s.id === selectedSubject)?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Papers:</span>
                    <span>{selectedPapers.length} papers ({totalPages} pages)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery to:</span>
                    <span className="text-right max-w-[200px]">{address}, {city}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{phone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment:</span>
                    <span className="capitalize">{paymentMethod.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="border-t border-border pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Printing ({totalPages} pages × Rs.{settings?.model_paper_price_per_page}):</span>
                      <span>Rs. {(totalPages * (settings?.model_paper_price_per_page || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery Fee:</span>
                      <span>Rs. {settings?.base_delivery_fee?.toLocaleString()}</span>
                    </div>
                    {paymentMethod === 'cod' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">COD Fee:</span>
                        <span>Rs. {settings?.cod_extra_fee?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-lg pt-2 border-t border-border">
                      <span>Total:</span>
                      <span className="text-brand">Rs. {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 1) {
                    setViewMode('orders');
                    resetForm();
                  } else {
                    setStep(step - 1);
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>
              
              {step < 4 ? (
                <Button
                  variant="brand"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="brand"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : paymentMethod === 'card' ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Now
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit Order
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrintRequestDialog;
