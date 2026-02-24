import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Music, FileText, DollarSign, Eye, Save, Send, Plus, Import } from "lucide-react";

interface UploadArrangementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock data for existing songs (in real app, this would come from a database)
const getExistingSongs = () => [
  {
    id: 1,
    title: "Amazing Grace",
    artist: "John Newton",
    key: "G",
    tempo: "80",
    tags: "traditional, hymn",
    hasLyrics: true,
    hasChords: true,
    sectionsCount: 4
  },
  {
    id: 2,
    title: "How Great Thou Art",
    artist: "Carl Boberg",
    key: "C",
    tempo: "120",
    tags: "worship, classic",
    hasLyrics: true,
    hasChords: true,
    sectionsCount: 6
  }
];

const UploadArrangementModal = ({ open, onOpenChange }: UploadArrangementModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [sourceMode, setSourceMode] = useState<"existing" | "new">("existing");
  const [selectedSong, setSelectedSong] = useState<number | null>(null);
  const [existingSongs] = useState(getExistingSongs());
  
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    originalKey: "",
    genre: "",
    tempo: "",
    description: "",
    type: "free" as "free" | "premium",
    price: "",
    tags: [] as string[],
    chordFile: null as File | null,
    lyricsFile: null as File | null,
    audioFile: null as File | null,
    status: "draft" as "draft" | "published"
  });

  // Auto-populate form when a song is selected
  useEffect(() => {
    if (selectedSong && sourceMode === "existing") {
      const song = existingSongs.find(s => s.id === selectedSong);
      if (song) {
        setFormData(prev => ({
          ...prev,
          title: song.title,
          artist: song.artist,
          originalKey: song.key,
          tempo: song.tempo,
          tags: song.tags.split(", ")
        }));
      }
    }
  }, [selectedSong, sourceMode, existingSongs]);

  const steps = [
    { id: 1, title: "Select Source", icon: Import },
    { id: 2, title: sourceMode === "existing" ? "Song Details" : "Basic Info", icon: FileText },
    { id: 3, title: "Files Upload", icon: Upload },
    { id: 4, title: "Pricing & Tags", icon: DollarSign },
    { id: 5, title: "Preview & Publish", icon: Eye }
  ];

  const genres = [
    "Contemporary Worship", "Traditional Hymns", "Gospel", "Praise & Worship",
    "Christmas", "Easter", "Acoustic", "Rock Worship", "Pop Worship", "Folk"
  ];

  const commonTags = [
    "Beginner Friendly", "Advanced", "Easy Chords", "Capo Required",
    "Wedding", "Youth", "Children", "Sunday Service", "Small Group"
  ];

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleFileUpload = (type: 'chord' | 'lyrics' | 'audio', file: File) => {
    setFormData(prev => ({
      ...prev,
      [`${type}File`]: file
    }));
  };

  const handleNext = () => {
    if (currentStep === 1 && sourceMode === "existing" && !selectedSong) {
      return; // Don't proceed without selecting a song
    }
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSave = (status: "draft" | "published") => {
    setFormData(prev => ({ ...prev, status }));
    // Handle save logic here
    
    onOpenChange(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Choose Your Song Source</h3>
              <p className="text-muted-foreground">Upload from existing editor songs or create new</p>
            </div>

            <RadioGroup 
              value={sourceMode} 
              onValueChange={(value: "existing" | "new") => {
                setSourceMode(value);
                setSelectedSong(null);
                if (value === "new") {
                  setFormData({
                    title: "",
                    artist: "",
                    originalKey: "",
                    genre: "",
                    tempo: "",
                    description: "",
                    type: "free",
                    price: "",
                    tags: [],
                    chordFile: null,
                    lyricsFile: null,
                    audioFile: null,
                    status: "draft"
                  });
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Card className={`cursor-pointer transition-all ${sourceMode === "existing" ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing" className="text-lg font-medium cursor-pointer">
                      📚 From Editor Library
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select from songs you've already created in the editor with complete lyrics and chords
                  </p>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${sourceMode === "new" ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="text-lg font-medium cursor-pointer">
                      ✨ Create New
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start fresh with a new song arrangement and upload files manually
                  </p>
                </CardContent>
              </Card>
            </RadioGroup>

            {sourceMode === "existing" && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Select a Song from Your Editor</Label>
                <div className="grid gap-3">
                  {existingSongs.map((song) => (
                    <Card 
                      key={song.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedSong === song.id ? "ring-2 ring-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedSong(song.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{song.title}</h4>
                            <p className="text-sm text-muted-foreground">{song.artist}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">Key: {song.key}</Badge>
                              <Badge variant="outline" className="text-xs">{song.tempo} BPM</Badge>
                              <Badge variant="outline" className="text-xs">{song.sectionsCount} sections</Badge>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {song.hasLyrics && <Badge className="text-xs bg-green-100 text-green-800">✓ Lyrics</Badge>}
                            {song.hasChords && <Badge className="text-xs bg-blue-100 text-blue-800">♪ Chords</Badge>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {existingSongs.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h4 className="font-medium mb-2">No songs in editor yet</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create songs in the arrangement editor first, then upload them here
                      </p>
                      <Button variant="outline" asChild>
                        <a href="/editor">
                          <Plus className="h-4 w-4 mr-2" />
                          Go to Editor
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        );

      case 2:
        if (sourceMode === "existing") {
          const selectedSongData = selectedSong ? existingSongs.find(s => s.id === selectedSong) : null;
          return (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">📝 Song Information from Editor</h4>
                <p className="text-sm text-muted-foreground">
                  This information was imported from your editor. You can modify it for this upload.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Song Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Amazing Grace"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist/Composer</Label>
                  <Input
                    id="artist"
                    value={formData.artist}
                    onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                    placeholder="e.g., Chris Tomlin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalKey">Original Key</Label>
                  <Select value={formData.originalKey} onValueChange={(value) => setFormData(prev => ({ ...prev, originalKey: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select key" />
                    </SelectTrigger>
                    <SelectContent>
                      {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={formData.genre} onValueChange={(value) => setFormData(prev => ({ ...prev, genre: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map(genre => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempo">Tempo (BPM)</Label>
                  <Input
                    id="tempo"
                    type="number"
                    value={formData.tempo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tempo: e.target.value }))}
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the arrangement, difficulty level, special notes..."
                  rows={4}
                />
              </div>

              {selectedSongData && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2"> Content Ready from Editor</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• Lyrics: {selectedSongData.hasLyrics ? "Complete" : "Missing"}</p>
                    <p>• Chords: {selectedSongData.hasChords ? "Complete" : "Missing"}</p>
                    <p>• Sections: {selectedSongData.sectionsCount} sections created</p>
                    <p className="text-xs mt-2 text-green-600">Files will be generated automatically from your editor content.</p>
                  </div>
                </div>
              )}
            </div>
          );
        } else {
          // New song creation - same as original step 1
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Song Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Amazing Grace"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist/Composer</Label>
                  <Input
                    id="artist"
                    value={formData.artist}
                    onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                    placeholder="e.g., Chris Tomlin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalKey">Original Key</Label>
                  <Select value={formData.originalKey} onValueChange={(value) => setFormData(prev => ({ ...prev, originalKey: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select key" />
                    </SelectTrigger>
                    <SelectContent>
                      {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={formData.genre} onValueChange={(value) => setFormData(prev => ({ ...prev, genre: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map(genre => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempo">Tempo (BPM)</Label>
                  <Input
                    id="tempo"
                    type="number"
                    value={formData.tempo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tempo: e.target.value }))}
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the arrangement, difficulty level, special notes..."
                  rows={4}
                />
              </div>
            </div>
          );
        }

      case 3:
        return (
          <div className="space-y-6">
            {sourceMode === "existing" && selectedSong && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-green-800 mb-2">📁 Files from Editor</h4>
                <p className="text-sm text-green-700 mb-3">
                  Your chord charts and lyrics will be automatically generated from the editor content. 
                  You only need to upload an optional audio demo.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center text-green-700">
                    <FileText className="h-4 w-4 mr-2" />
                    Chord chart: Auto-generated
                  </div>
                  <div className="flex items-center text-green-700">
                    <FileText className="h-4 w-4 mr-2" />
                    Lyrics: Auto-generated
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sourceMode === "new" && (
                <>
                  <Card className="border-2 border-dashed hover:border-primary transition-colors">
                    <CardHeader className="text-center pb-2">
                      <Music className="h-8 w-8 mx-auto text-primary" />
                      <CardTitle className="text-sm">Chord Chart</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('chord', e.target.files[0])}
                        className="hidden"
                        id="chord-upload"
                      />
                      <Label htmlFor="chord-upload" className="cursor-pointer">
                        <Button variant="outline" className="w-full" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Chords
                          </span>
                        </Button>
                      </Label>
                      {formData.chordFile && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {formData.chordFile.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-dashed hover:border-primary transition-colors">
                    <CardHeader className="text-center pb-2">
                      <FileText className="h-8 w-8 mx-auto text-primary" />
                      <CardTitle className="text-sm">Lyrics</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('lyrics', e.target.files[0])}
                        className="hidden"
                        id="lyrics-upload"
                      />
                      <Label htmlFor="lyrics-upload" className="cursor-pointer">
                        <Button variant="outline" className="w-full" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Lyrics
                          </span>
                        </Button>
                      </Label>
                      {formData.lyricsFile && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {formData.lyricsFile.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              <Card className="border-2 border-dashed hover:border-primary transition-colors">
                <CardHeader className="text-center pb-2">
                  <Music className="h-8 w-8 mx-auto text-primary" />
                  <CardTitle className="text-sm">Audio Demo</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload('audio', e.target.files[0])}
                    className="hidden"
                    id="audio-upload"
                  />
                  <Label htmlFor="audio-upload" className="cursor-pointer">
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Audio
                      </span>
                    </Button>
                  </Label>
                  {formData.audioFile && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {formData.audioFile.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">File Requirements:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {sourceMode === "new" && (
                  <>
                    <li>• Chord charts: PDF, TXT, DOC, DOCX (max 10MB)</li>
                    <li>• Lyrics: PDF, TXT, DOC, DOCX (max 5MB)</li>
                  </>
                )}
                <li>• Audio demo: MP3, WAV, M4A (max 50MB, 30-60 seconds recommended)</li>
                {sourceMode === "existing" && (
                  <li>• Audio is optional - chord charts and lyrics are automatically generated</li>
                )}
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Arrangement Type</Label>
              <RadioGroup 
                value={formData.type} 
                onValueChange={(value: "free" | "premium") => setFormData(prev => ({ ...prev, type: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free" id="free" />
                  <Label htmlFor="free">Free - Available to all users</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="premium" id="premium" />
                  <Label htmlFor="premium">Premium - Paid download</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.type === "premium" && (
              <div className="space-y-2">
                <Label htmlFor="price">Price (Rp)</Label>
                <Select value={formData.price} onValueChange={(value) => setFormData(prev => ({ ...prev, price: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5000">Rp5.000</SelectItem>
                    <SelectItem value="10000">Rp10.000</SelectItem>
                    <SelectItem value="15000">Rp15.000</SelectItem>
                    <SelectItem value="20000">Rp20.000</SelectItem>
                    <SelectItem value="25000">Rp25.000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <Label>Tags (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonTags.map(tag => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox 
                      id={tag}
                      checked={formData.tags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <Label htmlFor={tag} className="text-sm cursor-pointer">{tag}</Label>
                  </div>
                ))}
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Arrangement Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sourceMode === "existing" && selectedSong && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-800 text-sm">📚 Source: Editor Library</h4>
                    <p className="text-xs text-blue-700">Content imported from your arrangement editor</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-sm">{formData.title || "Untitled"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Artist</Label>
                    <p className="text-sm">{formData.artist || "Unknown"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Key</Label>
                    <p className="text-sm">{formData.originalKey || "Not specified"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Genre</Label>
                    <p className="text-sm">{formData.genre || "Not specified"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Type & Price</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {formData.type === "premium" ? (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                        Premium - Rp{formData.price}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Files</Label>
                  <div className="space-y-1 mt-1">
                    {sourceMode === "existing" && selectedSong ? (
                      <>
                        <p className="text-xs text-green-600">✓ Chord Chart: Auto-generated from editor</p>
                        <p className="text-xs text-green-600">✓ Lyrics: Auto-generated from editor</p>
                        <p className="text-xs">✓ Audio: {formData.audioFile?.name || "Not uploaded (optional)"}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs">✓ Chord Chart: {formData.chordFile?.name || "Not uploaded"}</p>
                        <p className="text-xs">✓ Lyrics: {formData.lyricsFile?.name || "Not uploaded"}</p>
                        <p className="text-xs">✓ Audio: {formData.audioFile?.name || "Not uploaded"}</p>
                      </>
                    )}
                  </div>
                </div>

                {formData.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleSave("draft")}
                variant="outline"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button 
                onClick={() => handleSave("published")}
                className="flex-1 bg-gradient-worship hover:opacity-90"
              >
                <Send className="h-4 w-4 mr-2" />
                Publish Arrangement
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload New Arrangement</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= step.id 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted-foreground text-muted-foreground"
              }`}>
                <step.icon className="h-4 w-4" />
              </div>
              <span className={`ml-2 text-sm ${
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-px mx-4 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          {currentStep < 5 && (
            <Button 
              onClick={handleNext}
              disabled={currentStep === 1 && sourceMode === "existing" && !selectedSong}
            >
              {currentStep === 1 && sourceMode === "existing" && !selectedSong ? "Select a Song" : "Next"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadArrangementModal;