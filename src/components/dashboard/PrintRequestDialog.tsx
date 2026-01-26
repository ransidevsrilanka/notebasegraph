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
} from 'lucide-react';
import { toast } from 'sonner';

interface PrintSettings {
  notes_price_per_page: number;
  model_paper_price_per_page: number;
  base_delivery_fee: number;
  cod_extra_fee: number;
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

interface PrintRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PrintType = 'notes_only' | 'model_papers_only' | 'both';
type PaymentMethod = 'card' | 'bank_transfer' | 'cod';

const PrintRequestDialog = ({ open, onOpenChange }: PrintRequestDialogProps) => {
  const { user, profile, enrollment, userSubjects } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<PrintSettings | null>(null);
  
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
  
  // Pricing
  const [estimatedPages, setEstimatedPages] = useState(50);
  
  // Load settings and subjects on mount
  useEffect(() => {
    if (open) {
      loadSettings();
      loadSubjects();
      // Pre-fill from profile
      if (profile?.full_name) setFullName(profile.full_name);
      // Phone is retrieved from profile if available
      const profileAny = profile as any;
      if (profileAny?.phone) setPhone(profileAny.phone);
    }
  }, [open, profile]);
  
  // Load topics when subject changes
  useEffect(() => {
    if (selectedSubject) {
      loadTopics(selectedSubject);
    }
  }, [selectedSubject]);
  
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
  
  const loadSubjects = async () => {
    if (!enrollment) return;
    
    // Get user's enrolled subjects
    const subjectNames = userSubjects ? [
      userSubjects.subject_1,
      userSubjects.subject_2,
      userSubjects.subject_3,
    ].filter(Boolean) : [];
    
    if (subjectNames.length === 0) {
      // Fallback to all subjects for grade
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
  
  const handleSubmit = async () => {
    if (!user || !enrollment) return;
    
    setIsLoading(true);
    
    const requestNumber = `PR${Date.now().toString(36).toUpperCase()}`;
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name || '';
    
    const { error } = await supabase
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
        payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
      });
    
    if (error) {
      toast.error('Failed to submit request');
      console.error(error);
    } else {
      toast.success('Print request submitted! We\'ll contact you soon.');
      onOpenChange(false);
      resetForm();
    }
    
    setIsLoading(false);
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
  };
  
  const canProceed = () => {
    switch (step) {
      case 1: return true;
      case 2: return selectedSubject && (allTopics || selectedTopics.length > 0);
      case 3: return fullName && address && phone;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-brand" />
            Request Printouts
          </DialogTitle>
          <DialogDescription>
            Get your notes and model papers printed and delivered
          </DialogDescription>
        </DialogHeader>
        
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
                        className="flex items-center gap-2"
                        onClick={() => {
                          setSelectedTopics(prev =>
                            prev.includes(topic.id)
                              ? prev.filter(t => t !== topic.id)
                              : [...prev, topic.id]
                          );
                        }}
                      >
                        <Checkbox
                          checked={selectedTopics.includes(topic.id)}
                        />
                        <span className="text-sm cursor-pointer">{topic.name}</span>
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
                <span className="text-muted-foreground">Delivery Address</span>
                <span className="text-foreground font-medium text-right max-w-[200px] truncate">{address}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-foreground font-medium">{phone}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="text-foreground font-medium capitalize">{paymentMethod.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="text-foreground">Rs. {settings?.base_delivery_fee || 0}</span>
              </div>
              {paymentMethod === 'cod' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">COD Fee</span>
                  <span className="text-orange-500">Rs. {settings?.cod_extra_fee || 0}</span>
                </div>
              )}
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
          {step > 1 && (
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
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Submitting...' : 'Submit Request'}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintRequestDialog;
