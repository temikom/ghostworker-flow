import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Copy, MessageSquare, Tag, Folder } from 'lucide-react';
import { cannedResponsesApi, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { CannedResponse, CannedResponseCategory } from '@/types/advanced';

// Mock data
const MOCK_CATEGORIES: CannedResponseCategory[] = [
  { id: '1', name: 'Greetings', color: '#3B82F6', responseCount: 5 },
  { id: '2', name: 'Support', color: '#10B981', responseCount: 12 },
  { id: '3', name: 'Sales', color: '#F59E0B', responseCount: 8 },
  { id: '4', name: 'Closing', color: '#8B5CF6', responseCount: 4 },
];

const MOCK_RESPONSES: CannedResponse[] = [
  {
    id: '1',
    name: 'Welcome Message',
    content: 'Hello! Welcome to our store. How can I help you today?',
    category: 'Greetings',
    shortcut: '/welcome',
    tags: ['greeting', 'start'],
    language: 'en',
    usageCount: 245,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Order Status',
    content: 'Thank you for your inquiry! I can see your order #{{order_id}} is currently {{status}}. Is there anything else I can help you with?',
    category: 'Support',
    shortcut: '/orderstatus',
    tags: ['order', 'status', 'support'],
    language: 'en',
    usageCount: 189,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'Refund Policy',
    content: 'Our refund policy allows returns within 30 days of purchase. Would you like me to initiate a return for you?',
    category: 'Support',
    shortcut: '/refund',
    tags: ['refund', 'policy', 'return'],
    language: 'en',
    usageCount: 87,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '4',
    name: 'Thank You',
    content: 'Thank you for shopping with us! If you have any more questions, feel free to reach out anytime. Have a great day! 😊',
    category: 'Closing',
    shortcut: '/thanks',
    tags: ['closing', 'thank'],
    language: 'en',
    usageCount: 312,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const CannedResponses = () => {
  const [responses, setResponses] = useState<CannedResponse[]>(MOCK_RESPONSES);
  const [categories, setCategories] = useState<CannedResponseCategory[]>(MOCK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: '',
    shortcut: '',
    tags: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [responsesData, categoriesData] = await Promise.all([
        cannedResponsesApi.getAll({ category: selectedCategory !== 'all' ? selectedCategory : undefined, search: searchQuery }),
        cannedResponsesApi.getCategories(),
      ]);
      setResponses(responsesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch canned responses:', error);
      setResponses(MOCK_RESPONSES);
      setCategories(MOCK_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const filteredResponses = responses.filter((r) => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.shortcut?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenDialog = (response?: CannedResponse) => {
    if (response) {
      setEditingResponse(response);
      setFormData({
        name: response.name,
        content: response.content,
        category: response.category,
        shortcut: response.shortcut || '',
        tags: response.tags.join(', '),
      });
    } else {
      setEditingResponse(null);
      setFormData({ name: '', content: '', category: '', shortcut: '', tags: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        name: formData.name,
        content: formData.content,
        category: formData.category,
        shortcut: formData.shortcut || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editingResponse) {
        await cannedResponsesApi.update(editingResponse.id, data);
        toast.success('Response updated');
      } else {
        await cannedResponsesApi.create(data);
        toast.success('Response created');
      }
      
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await cannedResponsesApi.delete(id);
      toast.success('Response deleted');
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const getCategoryColor = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.color || '#6B7280';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Canned Responses</h1>
            <p className="text-muted-foreground">Pre-written messages for quick replies</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Response
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <Folder className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {categories.map((cat) => (
            <Card 
              key={cat.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedCategory(cat.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <Badge variant="secondary">{cat.responseCount}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Responses Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResponses.map((response) => (
            <Card key={response.id} className="group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      {response.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        style={{ 
                          borderColor: getCategoryColor(response.category),
                          color: getCategoryColor(response.category),
                        }}
                      >
                        {response.category}
                      </Badge>
                      {response.shortcut && (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {response.shortcut}
                        </code>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCopy(response.content)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenDialog(response)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive" 
                        onClick={() => handleDelete(response.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {response.content}
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {response.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {response.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{response.tags.length - 3}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Used {response.usageCount} times
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredResponses.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No responses found</h3>
              <p className="text-muted-foreground text-center mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Create your first canned response'}
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Response
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingResponse ? 'Edit Response' : 'Create Response'}
              </DialogTitle>
              <DialogDescription>
                Create a reusable message template for quick replies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Welcome Message"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Message Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Type your message template here..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{variable}}'} for dynamic content (e.g., {'{{order_id}}'}, {'{{customer_name}}'})
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shortcut">Shortcut</Label>
                  <Input
                    id="shortcut"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                    placeholder="/welcome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="greeting, welcome, start"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : editingResponse ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CannedResponses;
