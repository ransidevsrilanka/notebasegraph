import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
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
  Scroll,
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
  AlertCircle,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

interface PrintSettings {
  notes_price_per_page: number;
  model_paper_price_per_page: number;
  base_delivery_fee: number;
  cod_extra_fee: number;
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

interface PrintRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PrintType = 'notes_only' | 'model_papers_only' | 'both';
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
  
  // Existing orders
  const [existingOrders, setExistingOrders] = useState<PrintOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<PrintSettings | null>(null);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  
  // Step 1: Content Type
  const [printType, setPrintType] = useState<PrintType>('notes_only');
  
  // Step 2: Subject & Topics
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState(false);
  
  // Step 3: Delivery Info
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  
  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  
  // Bank Transfer Flow
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // COD confirmation
  const [codConfirmed, setCodConfirmed] = useState(false);
  
  // Pricing
  const [estimatedPages, setEstimatedPages] = useState(50);
  
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
    }
  }, [selectedSubject]);
  
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
      // Default fallback
      setBankSettings({
        bank_name: 'Commercial Bank',
        account_number: '1234567890',
        account_holder: 'Notebase',
        branch_name: 'Main Branch',
      });
    }
  };
  
  const loadSubjects = async () => {
    if (!enrollment) return;
    
    const subjectNames = userSubjects ? [
      userSubjects.subject_1,
      userSubjects.subject_2,
      userSubjects.subject_3,
    ].filter(Boolean) : [];
    
    if (subjectNames.length === 0) {
      const { data } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('grade', enrollment.grade)
        .eq('is_active', true);
      
      if (data) setSubjects(data);
    } else {
      const { data } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('grade', enrollment.grade)
        .eq('is_active', true)
        .in('name', subjectNames);
      
      if (data) setSubjects(data);
    }
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
    
    let pricePerPage = settings.notes_price_per_page;
    if (printType === 'model_papers_only') {
      pricePerPage = settings.model_paper_price_per_page;
    } else if (printType === 'both') {
      pricePerPage = (settings.notes_price_per_page + settings.model_paper_price_per_page) / 2;
    }
    
    const itemsTotal = estimatedPages * pricePerPage;
    const deliveryFee = settings.base_delivery_fee;
    const codFee = paymentMethod === 'cod' ? settings.cod_extra_fee : 0;
    
    return itemsTotal + deliveryFee + codFee;
  };
  
  const handleReceiptUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${user.id}/print_${timestamp}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('print-receipts')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
          cacheControl: '3600',
        });
      
      if (error) {
        console.error('Storage upload error:', {
          error,
          bucket: 'print-receipts',
          path: filePath,
          userId: user.id,
        });
        toast.error('Failed to upload receipt');
        setIsUploading(false);
        return null;
      }
      
      setIsUploading(false);
      return filePath;
      
    } catch (err: any) {
      console.error('Receipt upload error:', err);
      toast.error(err?.message || 'Failed to upload receipt');
      setIsUploading(false);
      return null;
    }
  };
  
  const initiateCardPayment = async (printRequestId: string) => {
    if (!user || !enrollment) return;
    
    try {
      // Call with explicit generate-hash path for print request payments
      const { data, error } = await supabase.functions.invoke('payhere-checkout/generate-hash', {
        body: {
          order_id: `PR-${printRequestId.substring(0, 8)}`,
          items: `Print Request - ${subjects.find(s => s.id === selectedSubject)?.name}`,
          amount: calculateTotal(),
          currency: 'LKR',
          first_name: fullName.split(' ')[0] || 'Customer',
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          phone: phone,
          address: address,
          city: city || 'Colombo',
          country: 'Sri Lanka',
          print_request_id: printRequestId,
        }
      });
      
      if (error) {
        console.error('PayHere checkout error:', error);
        toast.error('Failed to initiate payment');
        setIsLoading(false);
        return;
      }
      
      // Create PayHere form and submit
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.sandbox 
        ? 'https://sandbox.payhere.lk/pay/checkout' 
        : 'https://www.payhere.lk/pay/checkout';
      
      // Add all PayHere fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'sandbox') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }
      });
      
      document.body.appendChild(form);
      form.submit();
      
    } catch (err: any) {
      console.error('Card payment error:', err);
      toast.error('Failed to process payment');
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!user || !enrollment) return;
    
    setIsLoading(true);
    
    const requestNumber = referenceNumber || generateReferenceNumber();
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name || '';
    
    let receiptUrl: string | null = null;
    
    // Handle bank transfer receipt upload
    if (paymentMethod === 'bank_transfer' && receiptFile) {
      receiptUrl = await handleReceiptUpload(receiptFile);
      if (!receiptUrl) {
        setIsLoading(false);
        return;
      }
    }
    
    // Create print request record
    const { data: printRequest, error } = await supabase
      .from('print_requests')
      .insert({
        user_id: user.id,
        request_number: requestNumber,
        full_name: fullName,
        address,
        phone,
        city,
        print_type: printType,
        subject_id: selectedSubject,
        subject_name: subjectName,
        topic_ids: allTopics ? [] : selectedTopics,
        estimated_pages: estimatedPages,
        estimated_price: calculateTotal() - (settings?.base_delivery_fee || 0) - (paymentMethod === 'cod' ? settings?.cod_extra_fee || 0 : 0),
        delivery_fee: settings?.base_delivery_fee || 0,
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'bank_transfer' ? 'pending_verification' : 'pending',
        status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
        receipt_url: receiptUrl,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to submit request');
      console.error(error);
      setIsLoading(false);
      return;
    }
    
    // Handle different payment methods
    if (paymentMethod === 'card') {
      await initiateCardPayment(printRequest.id);
    } else if (paymentMethod === 'bank_transfer') {
      toast.success('Print request submitted! Please wait for verification.');
      resetForm();
      loadExistingOrders();
      setViewMode('orders');
      setIsLoading(false);
    } else if (paymentMethod === 'cod') {
      toast.success('Print request submitted! Payment will be collected upon delivery.');
      resetForm();
      loadExistingOrders();
      setViewMode('orders');
      setIsLoading(false);
    }
  };
  
  const startNewRequest = () => {
    setViewMode('new_request');
    setStep(1);
    setReferenceNumber(generateReferenceNumber());
  };
  
  const resetForm = () => {
    setStep(1);
    setPrintType('notes_only');
    setSelectedSubject('');
    setSelectedTopics([]);
    setAllTopics(false);
    setAddress('');
    setCity('');
    setPaymentMethod('cod');
    setReceiptFile(null);
    setCodConfirmed(false);
    setReferenceNumber('');
  };
  
  const canProceed = () => {
    switch (step) {
      case 1: return true;
      case 2: return selectedSubject && (allTopics || selectedTopics.length > 0);
      case 3: return fullName && address && phone;
      case 4: 
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
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-brand text-primary-foreground'
                      : step > s
                      ? 'bg-green-500 text-white'
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  {s < 5 && <div className={`w-6 h-0.5 ${step > s ? 'bg-green-500' : 'bg-secondary'}`} />}
                </div>
              ))}
            </div>
            
            {/* Step 1: Content Type */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">What would you like printed?</h3>
                <RadioGroup value={printType} onValueChange={(v) => setPrintType(v as PrintType)}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-brand/50 cursor-pointer" onClick={() => setPrintType('notes_only')}>
                    <RadioGroupItem value="notes_only" id="notes_only" />
                    <FileText className="w-5 h-5 text-brand" />
                    <div>
                      <Label htmlFor="notes_only" className="cursor-pointer font-medium">Notes Only</Label>
                      <p className="text-xs text-muted-foreground">Study notes and summaries</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-brand/50 cursor-pointer" onClick={() => setPrintType('model_papers_only')}>
                    <RadioGroupItem value="model_papers_only" id="model_papers_only" />
                    <Scroll className="w-5 h-5 text-orange-500" />
                    <div>
                      <Label htmlFor="model_papers_only" className="cursor-pointer font-medium">Model Papers Only</Label>
                      <p className="text-xs text-muted-foreground">Past papers and practice exams</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-brand/50 cursor-pointer" onClick={() => setPrintType('both')}>
                    <RadioGroupItem value="both" id="both" />
                    <Printer className="w-5 h-5 text-purple-500" />
                    <div>
                      <Label htmlFor="both" className="cursor-pointer font-medium">Both</Label>
                      <p className="text-xs text-muted-foreground">Notes and model papers together</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
            
            {/* Step 2: Subject & Topics */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Select Subject & Topics</h3>
                
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedSubject && topics.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="allTopics"
                        checked={allTopics}
                        onCheckedChange={(checked) => {
                          setAllTopics(!!checked);
                          if (checked) setSelectedTopics([]);
                        }}
                      />
                      <Label htmlFor="allTopics" className="cursor-pointer">All Topics</Label>
                    </div>
                    
                    {!allTopics && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {topics.map((topic) => (
                          <div
                            key={topic.id}
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setSelectedTopics(prev =>
                                prev.includes(topic.id)
                                  ? prev.filter(t => t !== topic.id)
                                  : [...prev, topic.id]
                              );
                            }}
                          >
                            <Checkbox checked={selectedTopics.includes(topic.id)} />
                            <span className="text-sm">{topic.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <Label className="text-xs text-muted-foreground">Estimated Pages</Label>
                  <Input
                    type="number"
                    value={estimatedPages}
                    onChange={(e) => setEstimatedPages(parseInt(e.target.value) || 0)}
                    min={1}
                    max={500}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            
            {/* Step 3: Delivery Info */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Delivery Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, apartment, etc."
                      className="pl-10 min-h-[80px]"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07X XXX XXXX"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Payment Method */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Payment Method</h3>
                
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-brand/50 cursor-pointer" onClick={() => setPaymentMethod('card')}>
                    <RadioGroupItem value="card" id="card" />
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    <div>
                      <Label htmlFor="card" className="cursor-pointer font-medium">Card Payment</Label>
                      <p className="text-xs text-muted-foreground">Pay now with debit/credit card</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-brand/50 cursor-pointer" onClick={() => setPaymentMethod('bank_transfer')}>
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <Building2 className="w-5 h-5 text-purple-500" />
                    <div>
                      <Label htmlFor="bank_transfer" className="cursor-pointer font-medium">Bank Transfer</Label>
                      <p className="text-xs text-muted-foreground">Transfer to our bank account</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-brand/50 bg-brand/5 cursor-pointer" onClick={() => setPaymentMethod('cod')}>
                    <RadioGroupItem value="cod" id="cod" />
                    <Truck className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <Label htmlFor="cod" className="cursor-pointer font-medium">Cash on Delivery</Label>
                      <p className="text-xs text-muted-foreground">Pay when you receive</p>
                    </div>
                    {settings && (
                      <span className="text-xs text-orange-500">+Rs. {settings.cod_extra_fee}</span>
                    )}
                  </div>
                </RadioGroup>
                
                {/* Bank Transfer Details */}
                {paymentMethod === 'bank_transfer' && bankSettings && (
                  <div className="space-y-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <h4 className="font-medium text-purple-400">Bank Transfer Details</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank</span>
                        <span className="text-foreground">{bankSettings.bank_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account</span>
                        <span className="text-foreground font-mono">{bankSettings.account_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="text-foreground">{bankSettings.account_holder}</span>
                      </div>
                      {bankSettings.branch_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Branch</span>
                          <span className="text-foreground">{bankSettings.branch_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Reference Number</p>
                          <p className="font-mono font-bold text-brand text-lg">{referenceNumber}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={copyReference}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between p-3 bg-brand/10 rounded-lg">
                      <span className="font-medium">Amount to Transfer</span>
                      <span className="font-bold text-brand">Rs. {calculateTotal().toLocaleString()}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Upload Payment Receipt</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="receipt-upload"
                        />
                        <label
                          htmlFor="receipt-upload"
                          className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-brand/50 transition-colors"
                        >
                          {receiptFile ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <span className="text-sm text-green-500">{receiptFile.name}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Click to upload receipt</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* COD Confirmation */}
                {paymentMethod === 'cod' && (
                  <div className="space-y-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <Truck className="w-8 h-8 text-green-500" />
                      <div>
                        <h4 className="font-medium text-green-400">Cash on Delivery</h4>
                        <p className="text-xs text-muted-foreground">Payment will be collected upon delivery</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Address</span>
                        <span className="text-foreground text-right max-w-[180px]">{address}</span>
                      </div>
                      {city && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">City</span>
                          <span className="text-foreground">{city}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contact</span>
                        <span className="text-foreground">{phone}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between p-3 bg-brand/10 rounded-lg">
                      <span className="font-medium">Amount to Pay</span>
                      <span className="font-bold text-brand">Rs. {calculateTotal().toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-start gap-2 p-3 bg-background rounded-lg border border-border">
                      <Checkbox 
                        id="cod-confirm" 
                        checked={codConfirmed}
                        onCheckedChange={(checked) => setCodConfirmed(!!checked)}
                      />
                      <Label htmlFor="cod-confirm" className="text-xs text-muted-foreground cursor-pointer">
                        I understand that payment of Rs. {calculateTotal().toLocaleString()} will be collected upon delivery. Order will be cancelled if payment is refused.
                      </Label>
                    </div>
                  </div>
                )}
                
                {/* Card Payment Note */}
                {paymentMethod === 'card' && (
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <div className="flex items-center gap-2 text-blue-400">
                      <CreditCard className="w-5 h-5" />
                      <span className="text-sm font-medium">Secure Card Payment via PayHere</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      You will be redirected to PayHere's secure payment page after confirming your order.
                    </p>
                    <div className="flex justify-between p-3 bg-brand/10 rounded-lg mt-3">
                      <span className="font-medium">Amount to Pay</span>
                      <span className="font-bold text-brand">Rs. {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                {/* Price Summary */}
                {settings && (
                  <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Est. Print Cost</span>
                      <span>Rs. {(calculateTotal() - settings.base_delivery_fee - (paymentMethod === 'cod' ? settings.cod_extra_fee : 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span>Rs. {settings.base_delivery_fee}</span>
                    </div>
                    {paymentMethod === 'cod' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">COD Fee</span>
                        <span className="text-orange-500">Rs. {settings.cod_extra_fee}</span>
                      </div>
                    )}
                    <hr className="border-border" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-brand">Rs. {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Step 5: Confirmation */}
            {step === 5 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Order Summary</h3>
                
                <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Content Type</span>
                    <span className="text-foreground font-medium capitalize">{printType.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subject</span>
                    <span className="text-foreground font-medium">{subjects.find(s => s.id === selectedSubject)?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Topics</span>
                    <span className="text-foreground font-medium">{allTopics ? 'All Topics' : `${selectedTopics.length} selected`}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Pages</span>
                    <span className="text-foreground font-medium">{estimatedPages}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-foreground font-medium text-right max-w-[200px]">{address}, {city}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="text-foreground font-medium">{phone}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment</span>
                    <span className="text-foreground font-medium capitalize">{paymentMethod.replace(/_/g, ' ')}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-brand text-lg">Rs. {calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Final price may vary based on actual page count. We'll confirm before printing.
                </p>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {step === 1 ? (
                <Button variant="outline" onClick={() => setViewMode('orders')} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {step < 5 ? (
                <Button
                  variant="brand"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="brand"
                  onClick={handleSubmit}
                  disabled={isLoading || isUploading}
                  className="flex-1"
                >
                  {isLoading ? 'Processing...' : paymentMethod === 'card' ? 'Pay Now' : 'Submit Request'}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
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
