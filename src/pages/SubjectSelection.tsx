import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubjectSelection } from '@/hooks/useSubjectSelection';
import { BASKET_LABELS, OL_COMPULSORY_SUBJECTS } from '@/lib/subjectValidation';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  User,
} from 'lucide-react';
import { STREAM_LABELS, GRADE_LABELS } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';

const SubjectSelection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, enrollment, hasSelectedSubjects, refreshUserSubjects } = useAuth();
  const {
    subjectsByBasket,
    selectedSubjects,
    mandatorySubjects,
    validation,
    isLoading,
    isSaving,
    isLocked,
    isOL,
    firstLanguage,
    setFirstLanguage,
    religion,
    setReligion,
    olReligionOptions,
    olFirstLanguageOptions,
    toggleSubject,
    saveSelection,
  } = useSubjectSelection();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Redirect if already has locked subjects
  useEffect(() => {
    if (hasSelectedSubjects) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasSelectedSubjects, navigate]);

  if (!enrollment) {
    return null;
  }

  const handleConfirmSelection = async () => {
    const result = await saveSelection();
    setShowConfirmDialog(false);

    if (result.success) {
      setShowNameDialog(true);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save selection.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveName = async () => {
    if (!userName.trim() || !user) return;

    setIsSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: userName.trim() })
      .eq('user_id', user.id);

    setIsSavingName(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your name. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'All Set!',
      description: 'Your subjects and profile are now confirmed.',
    });
    
    await refreshUserSubjects();
    navigate('/dashboard', { replace: true });
  };

  if (isLocked) {
    return null;
  }

  // Get selected subject for each O/L basket
  const getSelectedFromBasket = (basketKey: string): string => {
    const subjects = subjectsByBasket[basketKey] || [];
    return selectedSubjects.find(s => subjects.some(subj => subj.subject_name === s)) || '';
  };

  // Handle O/L basket dropdown selection
  const handleBasketSelect = (basketKey: string, subjectName: string) => {
    const currentSelection = getSelectedFromBasket(basketKey);
    if (currentSelection === subjectName) return;
    
    // If there's a current selection in this basket, deselect it first
    if (currentSelection) {
      toggleSubject(currentSelection);
    }
    // Select the new subject
    if (subjectName) {
      toggleSubject(subjectName);
    }
  };

  // A/L basket order
  const alBasketOrder = ['mandatory', 'core', 'optional', 'restricted', 'religion', 'language', 'aesthetic'];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Compact Header */}
          <header className="py-6 border-b border-border mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="text-brand text-xs font-medium uppercase tracking-wider">Step 2 of 2</span>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1 tracking-tight">
                  {isOL ? 'Select Your O/L Subjects' : 'Select Your A/L Subjects'}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {GRADE_LABELS[enrollment.grade as keyof typeof GRADE_LABELS] || enrollment.grade}
                  {!isOL && enrollment.stream && ` • ${STREAM_LABELS[enrollment.stream as keyof typeof STREAM_LABELS]} Stream`}
                </p>
              </div>
              <div className="text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-lg">
                {isOL ? (
                  <>Choose <strong>1 from each category</strong> below</>
                ) : (
                  <>Choose exactly <strong>3 subjects</strong></>
                )}
              </div>
            </div>
          </header>

          {isLoading ? (
            <div className="glass-card p-12 text-center">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Loading subjects...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* O/L Layout - Compact with Dropdowns */}
              {isOL && (
                <>
                  {/* Compulsory Subjects - Compact */}
                  <div className="glass-card p-4">
                    <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      Compulsory Subjects
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* First Language Dropdown */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">First Language</Label>
                        <Select value={firstLanguage} onValueChange={setFirstLanguage}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            {olFirstLanguageOptions.map((subj) => (
                              <SelectItem key={subj.id} value={subj.subject_name}>
                                {subj.subject_name.replace('First Language (', '').replace(')', '')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Religion Dropdown */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Religion</Label>
                        <Select value={religion} onValueChange={setReligion}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select religion" />
                          </SelectTrigger>
                          <SelectContent>
                            {olReligionOptions.map((subj) => (
                              <SelectItem key={subj.id} value={subj.subject_name}>
                                {subj.subject_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fixed Subjects */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Fixed Subjects</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {OL_COMPULSORY_SUBJECTS.slice(0, 3).map((subject) => (
                            <Badge key={subject} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {OL_COMPULSORY_SUBJECTS.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{OL_COMPULSORY_SUBJECTS.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optional Subjects - 3 Dropdowns in a Row */}
                  <div className="glass-card p-4">
                    <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Optional Subjects (Choose 1 from each)
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['basket1', 'basket2', 'basket3'].map((basketKey) => {
                        const subjects = subjectsByBasket[basketKey] || [];
                        if (subjects.length === 0) return null;
                        
                        return (
                          <div key={basketKey} className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              {BASKET_LABELS[basketKey] || basketKey}
                            </Label>
                            <Select 
                              value={getSelectedFromBasket(basketKey)} 
                              onValueChange={(v) => handleBasketSelect(basketKey, v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.subject_name}>
                                    {subject.subject_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* A/L Layout - Compact Horizontal Grid */}
              {!isOL && (
                <div className="space-y-4">
                  {alBasketOrder.map((basketKey) => {
                    const subjects = subjectsByBasket[basketKey];
                    if (!subjects || subjects.length === 0) return null;

                    return (
                      <div key={basketKey} className="glass-card p-4">
                        <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          {BASKET_LABELS[basketKey] || basketKey}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {subjects.map((subject) => {
                            const isSelected = selectedSubjects.includes(subject.subject_name);
                            const isMandatory = mandatorySubjects.includes(subject.subject_name);
                            const isDisabled = selectedSubjects.length >= 3 && !isSelected;

                            return (
                              <label
                                key={subject.id}
                                className={`
                                  flex items-center gap-2 p-2.5 rounded-lg border transition-all text-sm
                                  ${isSelected 
                                    ? 'bg-brand/10 border-brand/40' 
                                    : 'bg-secondary/50 border-border hover:border-muted-foreground/30'}
                                  ${isMandatory ? 'cursor-default' : isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (isMandatory || isDisabled) return;
                                  toggleSubject(subject.subject_name);
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isMandatory}
                                  className="pointer-events-none h-4 w-4"
                                />
                                <span className={`flex-1 truncate ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                  {subject.subject_name}
                                </span>
                                {isMandatory && (
                                  <Lock className="w-3 h-3 text-brand shrink-0" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Validation Messages - Compact */}
              {validation.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm text-destructive">
                      {validation.errors.map((error, i) => (
                        <span key={i}>{error}{i < validation.errors.length - 1 ? ' • ' : ''}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {validation.warnings.length > 0 && validation.errors.length === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-600">
                      {validation.warnings.join(' • ')}
                    </div>
                  </div>
                </div>
              )}

              {validation.valid && selectedSubjects.length === 3 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Valid combination selected!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sticky Footer with Summary & Confirm */}
          <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-4 bg-background/95 backdrop-blur-sm border-t border-border">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">Selected ({selectedSubjects.length}/3):</span>
                {selectedSubjects.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSubjects.map((subject) => (
                      <Badge key={subject} variant="secondary" className="text-xs">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {subject}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">None selected</span>
                )}
              </div>

              <Button
                size="default"
                disabled={!validation.valid || selectedSubjects.length !== 3 || isSaving}
                onClick={() => setShowConfirmDialog(true)}
                className="shrink-0"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Confirm Selection'
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Subject Selection</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to lock in your subject choices. This selection <strong>cannot be changed later</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <p className="text-sm font-medium text-foreground mb-2">Your selected subjects:</p>
            <div className="flex flex-wrap gap-2">
              {selectedSubjects.map((subject) => (
                <Badge key={subject} variant="secondary">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSelection} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Confirm & Lock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Name Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-brand" />
              One Last Step
            </DialogTitle>
            <DialogDescription>
              Enter your full name as it should appear on certificates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g., Kasun Perera"
              className="mt-2"
            />
          </div>
          
          <DialogFooter>
            <Button
              onClick={handleSaveName}
              disabled={!userName.trim() || isSavingName}
            >
              {isSavingName ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default SubjectSelection;
