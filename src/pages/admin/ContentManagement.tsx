import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/storageClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  BookOpen,
  Plus,
  RefreshCw,
  Trash2,
  ChevronRight,
  FileText,
  Upload,
  FolderOpen,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import type { Subject, Topic, Note, GradeLevel, StreamType, MediumType, TierType, GradeGroup } from '@/types/database';
import { GRADE_LABELS, STREAM_LABELS, MEDIUM_LABELS, TIER_LABELS, GRADE_GROUPS } from '@/types/database';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const ContentManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // View state
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Subject form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState<GradeLevel>('al_grade12');
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<GradeGroup>('al');
  const [selectedStreams, setSelectedStreams] = useState<StreamType[]>(['maths']);
  const [medium, setMedium] = useState<MediumType>('english');

  // Topic form
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');

  // Note form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteMinTier, setNoteMinTier] = useState<TierType>('starter');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [noteUploadRequested, setNoteUploadRequested] = useState(false);

  const fetchSubjects = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('grade', { ascending: true })
      .order('stream', { ascending: true })
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setSubjects(data as Subject[]);
    }
    setIsLoading(false);
  };

  const fetchTopics = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subjectId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setTopics(data as Topic[]);
    }
  };

  const fetchNotes = async (topicId: string) => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data as Note[]);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject.id);
      setSelectedTopic(null);
      setNotes([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedTopic) {
      fetchNotes(selectedTopic.id);
    }
  }, [selectedTopic]);

  const handleAddSubject = async () => {
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }

    if (selectedStreams.length === 0) {
      toast.error('At least one stream is required');
      return;
    }

    setIsAdding(true);
    const { error } = await supabase
      .from('subjects')
      .insert({
        name,
        description,
        grade,
        stream: selectedStreams[0], // Legacy field for backwards compatibility
        streams: selectedStreams,
        medium,
        is_active: true,
      });

    if (error) {
      toast.error('Failed to add subject');
    } else {
      toast.success('Subject added');
      setName('');
      setDescription('');
      setSelectedStreams(['maths']);
      fetchSubjects();
    }
    setIsAdding(false);
  };

  const handleAddTopic = async () => {
    if (!topicName.trim() || !selectedSubject) {
      toast.error('Topic name is required');
      return;
    }

    setIsAdding(true);
    const { error } = await supabase
      .from('topics')
      .insert({
        subject_id: selectedSubject.id,
        name: topicName,
        description: topicDescription,
        is_active: true,
      });

    if (error) {
      toast.error('Failed to add topic');
    } else {
      toast.success('Topic added');
      setTopicName('');
      setTopicDescription('');
      fetchTopics(selectedSubject.id);
    }
    setIsAdding(false);
  };

  const handleUploadNote = async () => {
    if (!noteTitle.trim() || !selectedTopic || !noteFile) {
      toast.error('Title and file are required');
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to storage
      const fileExt = noteFile.name.split('.').pop();
      const fileName = `${selectedTopic.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(fileName, noteFile);

      if (uploadError) throw uploadError;

      // Store only the file path, not the public URL (security fix)
      const { error: insertError } = await supabase
        .from('notes')
        .insert({
          topic_id: selectedTopic.id,
          title: noteTitle,
          description: noteDescription,
          file_url: fileName, // Store path only, not full URL
          file_size: noteFile.size,
          min_tier: noteMinTier,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast.success('Note uploaded successfully');
      setNoteTitle('');
      setNoteDescription('');
      setNoteFile(null);
      setNoteMinTier('starter');
      fetchNotes(selectedTopic.id);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload note');
    }
    setIsUploading(false);
  };

  // Side-effect controlled note upload
  useEffect(() => {
    if (!noteUploadRequested) return;
    setNoteUploadRequested(false);
    void handleUploadNote();
  }, [noteUploadRequested]);

  const deleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete subject');
    } else {
      toast.success('Subject deleted');
      if (selectedSubject?.id === id) {
        setSelectedSubject(null);
      }
      fetchSubjects();
    }
  };

  const deleteTopic = async (id: string) => {
    if (!confirm('Delete this topic and all its notes?')) return;

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete topic');
    } else {
      toast.success('Topic deleted');
      if (selectedTopic?.id === id) {
        setSelectedTopic(null);
      }
      if (selectedSubject) fetchTopics(selectedSubject.id);
    }
  };

  const deleteNote = async (id: string, fileUrl: string | null) => {
    if (!confirm('Delete this note?')) return;

    // Delete from storage if file exists
    if (fileUrl) {
      const path = fileUrl.split('/notes/')[1];
      if (path) {
        await supabase.storage.from('notes').remove([path]);
      }
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete note');
    } else {
      toast.success('Note deleted');
      if (selectedTopic) fetchNotes(selectedTopic.id);
    }
  };

  const toggleSubjectActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('subjects')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (!error) {
      toast.success(isActive ? 'Subject deactivated' : 'Subject activated');
      fetchSubjects();
    }
  };

  // Breadcrumb navigation
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button 
        onClick={() => { setSelectedSubject(null); setSelectedTopic(null); }}
        className="text-brand hover:underline"
      >
        Subjects
      </button>
      {selectedSubject && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <button 
            onClick={() => setSelectedTopic(null)}
            className="text-brand hover:underline"
          >
            {selectedSubject.name}
          </button>
        </>
      )}
      {selectedTopic && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{selectedTopic.name}</span>
        </>
      )}
    </div>
  );

  // Subject List View
  const renderSubjectList = () => (
    <>
      {/* Add Subject Form */}
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand" />
          Add New Subject
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subject Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Combined Mathematics"
              className="bg-secondary border-border h-9"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="bg-secondary border-border h-9"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Level</label>
            <select
              value={selectedGradeGroup}
              onChange={(e) => {
                const group = e.target.value as GradeGroup;
                setSelectedGradeGroup(group);
                setGrade(GRADE_GROUPS[group].grades[0]);
              }}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {Object.entries(GRADE_GROUPS).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Grade</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as GradeLevel)}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {GRADE_GROUPS[selectedGradeGroup].grades.map((gradeValue) => (
                <option key={gradeValue} value={gradeValue}>{GRADE_LABELS[gradeValue]}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-2 block">Streams (select all that apply) *</label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STREAM_LABELS).map(([value, label]) => {
                const streamValue = value as StreamType;
                const isSelected = selectedStreams.includes(streamValue);
                return (
                  <label
                    key={value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-brand/10 border-brand/40 text-foreground' 
                        : 'bg-secondary border-border text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStreams([...selectedStreams, streamValue]);
                        } else {
                          setSelectedStreams(selectedStreams.filter(s => s !== streamValue));
                        }
                      }}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Medium</label>
            <select
              value={medium}
              onChange={(e) => setMedium(e.target.value as MediumType)}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {Object.entries(MEDIUM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <Button variant="brand" size="sm" onClick={handleAddSubject} disabled={isAdding}>
          {isAdding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Subject
        </Button>
      </div>

      {/* Subjects List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand" />
            Subjects ({subjects.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchSubjects}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No subjects added yet</div>
        ) : (
          <div>
            {/* Group by O/L and A/L */}
            {Object.entries(GRADE_GROUPS).map(([groupKey, { label, grades }]) => {
              const groupSubjects = subjects.filter(s => grades.includes(s.grade as GradeLevel));
              if (groupSubjects.length === 0) return null;
              
              return (
                <div key={groupKey}>
                  <div className="px-4 py-2 bg-muted/50 border-b border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {groupSubjects.map((subject) => (
                      <div key={subject.id} className="p-4 hover:bg-secondary/30 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedSubject(subject)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-brand" />
                            </div>
                            <div>
                              <p className={`text-foreground font-medium text-sm ${subject.medium === 'sinhala' ? 'font-sinhala' : ''}`}>
                                {subject.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-muted-foreground text-xs">
                                  {GRADE_LABELS[subject.grade]} • {MEDIUM_LABELS[subject.medium]}
                                </span>
                                <span className="text-muted-foreground text-xs">•</span>
                                {(subject.streams || [subject.stream]).map((s) => (
                                  <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {STREAM_LABELS[s]}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSubjectActive(subject.id, subject.is_active)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              subject.is_active ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                            }`}
                          >
                            {subject.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(subject)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSubject(subject.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // Topics View
  const renderTopicList = () => (
    <>
      {/* Add Topic Form */}
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand" />
          Add Topic to {selectedSubject?.name}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic Name *</label>
            <Input
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="e.g., Differentiation"
              className="bg-secondary border-border h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
              placeholder="Brief description"
              className="bg-secondary border-border h-9"
            />
          </div>
        </div>

        <Button variant="brand" size="sm" onClick={handleAddTopic} disabled={isAdding}>
          {isAdding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Topic
        </Button>
      </div>

      {/* Topics List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-brand" />
            Topics ({topics.length})
          </h2>
        </div>

        {topics.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No topics yet. Add one above.</div>
        ) : (
          <div className="divide-y divide-border">
            {topics.map((topic) => (
              <div key={topic.id} className="p-4 hover:bg-secondary/30 flex items-center justify-between">
                <button
                  onClick={() => setSelectedTopic(topic)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-sm">{topic.name}</p>
                      {topic.description && <p className="text-muted-foreground text-xs">{topic.description}</p>}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTopic(topic)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTopic(topic.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Notes View
  const renderNotesList = () => (
    <>
      {/* Upload Note Form */}
      <div className="glass-card p-5 mb-6">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-brand" />
          Upload Note to "{selectedTopic?.name}"
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Note Title *</label>
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g., Chapter 1 Notes"
              className="bg-secondary border-border h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input
              value={noteDescription}
              onChange={(e) => setNoteDescription(e.target.value)}
              placeholder="Brief description"
              className="bg-secondary border-border h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Minimum Tier</label>
            <select
              value={noteMinTier}
              onChange={(e) => setNoteMinTier(e.target.value as TierType)}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
            >
              {Object.entries(TIER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">File (PDF) *</label>
            <div className="relative">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                className="bg-secondary border-border h-9"
              />
              {noteFile && (
                <button
                  onClick={() => setNoteFile(null)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {noteFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {noteFile.name} ({(noteFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="brand"
          size="sm"
          onClick={() => setNoteUploadRequested(true)}
          disabled={isUploading || !noteFile}
        >
          {isUploading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand" />
            Notes ({notes.length})
          </h2>
        </div>

        {notes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No notes yet. Upload one above.</div>
        ) : (
          <div className="divide-y divide-border">
            {notes.map((note) => (
              <div key={note.id} className="p-4 hover:bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium text-sm">{note.title}</p>
                    <p className="text-muted-foreground text-xs">
                      Min: {TIER_LABELS[note.min_tier]} • {note.file_size ? `${(note.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {note.file_url && (
                    <a
                      href={note.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline text-sm"
                    >
                      View
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNote(note.id, note.file_url)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-background dashboard-theme">
      <header className="bg-vault-surface border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold text-foreground">Content Management</h1>
              <p className="text-muted-foreground text-sm">Manage subjects, topics, and notes</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {renderBreadcrumb()}
        
        {!selectedSubject && renderSubjectList()}
        {selectedSubject && !selectedTopic && renderTopicList()}
        {selectedSubject && selectedTopic && renderNotesList()}
      </div>
    </main>
  );
};

export default ContentManagement;