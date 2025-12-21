import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Tag, Users, Filter, Edit, Trash2, Search } from 'lucide-react';
import { customerApi, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { CustomerTag, CustomerSegment, Customer } from '@/types/advanced';

// Color options for tags
const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', 
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', 
  '#A855F7', '#EC4899', '#F43F5E',
];

// Mock data
const MOCK_TAGS: CustomerTag[] = [
  { id: '1', name: 'VIP', color: '#F59E0B', description: 'High-value customers', customerCount: 45, createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'New', color: '#22C55E', description: 'Recently joined', customerCount: 120, createdAt: '2024-01-01T00:00:00Z' },
  { id: '3', name: 'At Risk', color: '#EF4444', description: 'May churn soon', customerCount: 23, createdAt: '2024-01-01T00:00:00Z' },
  { id: '4', name: 'Frequent Buyer', color: '#3B82F6', description: 'Regular purchases', customerCount: 89, createdAt: '2024-01-01T00:00:00Z' },
];

const MOCK_SEGMENTS: CustomerSegment[] = [
  {
    id: '1',
    name: 'High Spenders',
    description: 'Customers with total orders > $1000',
    rules: [{ field: 'total_spent', operator: 'greater_than', value: 1000 }],
    customerCount: 156,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: '2',
    name: 'Inactive 30 Days',
    description: 'No activity in the last 30 days',
    rules: [{ field: 'last_interaction', operator: 'less_than', value: '30days' }],
    customerCount: 234,
    isActive: true,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    tags: [MOCK_TAGS[0], MOCK_TAGS[3]],
    segments: ['High Spenders'],
    totalConversations: 15,
    lastInteractionAt: '2024-01-20T10:00:00Z',
    createdAt: '2023-06-15T00:00:00Z',
    metadata: {},
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+0987654321',
    tags: [MOCK_TAGS[1]],
    segments: [],
    totalConversations: 3,
    lastInteractionAt: '2024-01-18T14:30:00Z',
    createdAt: '2024-01-10T00:00:00Z',
    metadata: {},
  },
];

const CustomerTagging = () => {
  const [tags, setTags] = useState<CustomerTag[]>(MOCK_TAGS);
  const [segments, setSegments] = useState<CustomerSegment[]>(MOCK_SEGMENTS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<CustomerTag | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: TAG_COLORS[0], description: '' });
  const [newSegment, setNewSegment] = useState({ name: '', description: '', rules: [] as any[] });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tagsData, segmentsData, customersData] = await Promise.all([
        customerApi.getTags(),
        customerApi.getSegments(),
        customerApi.getCustomers({ search: searchQuery, tags: selectedTag !== 'all' ? [selectedTag] : undefined }),
      ]);
      setTags(tagsData);
      setSegments(segmentsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
      setTags(MOCK_TAGS);
      setSegments(MOCK_SEGMENTS);
      setCustomers(MOCK_CUSTOMERS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedTag]);

  const handleCreateTag = async () => {
    if (!newTag.name) {
      toast.error('Please enter a tag name');
      return;
    }

    setIsLoading(true);
    try {
      if (editingTag) {
        await customerApi.updateTag(editingTag.id, newTag);
        toast.success('Tag updated');
      } else {
        await customerApi.createTag(newTag);
        toast.success('Tag created');
      }
      setTagDialogOpen(false);
      setEditingTag(null);
      setNewTag({ name: '', color: TAG_COLORS[0], description: '' });
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await customerApi.deleteTag(id);
      toast.success('Tag deleted');
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCreateSegment = async () => {
    if (!newSegment.name) {
      toast.error('Please enter a segment name');
      return;
    }

    setIsLoading(true);
    try {
      await customerApi.createSegment(newSegment);
      toast.success('Segment created');
      setSegmentDialogOpen(false);
      setNewSegment({ name: '', description: '', rules: [] });
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditTag = (tag: CustomerTag) => {
    setEditingTag(tag);
    setNewTag({ name: tag.name, color: tag.color, description: tag.description || '' });
    setTagDialogOpen(true);
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || c.tags.some(t => t.id === selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Customer Tagging</h1>
            <p className="text-muted-foreground">Organize and segment your customers</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSegmentDialogOpen(true)}>
              <Filter className="h-4 w-4 mr-2" />
              New Segment
            </Button>
            <Button onClick={() => { setEditingTag(null); setNewTag({ name: '', color: TAG_COLORS[0], description: '' }); setTagDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Tag
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tags Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </h2>
            <div className="space-y-2">
              {tags.map((tag) => (
                <Card key={tag.id} className="group">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <div>
                        <p className="font-medium text-sm">{tag.name}</p>
                        <p className="text-xs text-muted-foreground">{tag.customerCount} customers</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTag(tag)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTag(tag.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h2 className="text-lg font-medium flex items-center gap-2 mt-6">
              <Users className="h-5 w-5" />
              Segments
            </h2>
            <div className="space-y-2">
              {segments.map((segment) => (
                <Card key={segment.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{segment.name}</p>
                      <Badge variant={segment.isActive ? 'default' : 'secondary'}>
                        {segment.customerCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{segment.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Customers Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>Customers</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-[200px]"
                      />
                    </div>
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {tags.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Conversations</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {customer.tags.map((tag) => (
                              <Badge 
                                key={tag.id} 
                                variant="outline"
                                style={{ borderColor: tag.color, color: tag.color }}
                                className="text-xs"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{customer.totalConversations}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(customer.lastInteractionAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create/Edit Tag Dialog */}
        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
              <DialogDescription>
                {editingTag ? 'Update your customer tag.' : 'Create a new tag to organize customers.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tagName">Name *</Label>
                <Input
                  id="tagName"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  placeholder="VIP"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full transition-transform ${newTag.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTag({ ...newTag, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagDescription">Description</Label>
                <Input
                  id="tagDescription"
                  value={newTag.description}
                  onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                  placeholder="High-value customers"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTag} disabled={isLoading}>
                {isLoading ? 'Saving...' : editingTag ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Segment Dialog */}
        <Dialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Segment</DialogTitle>
              <DialogDescription>
                Create a dynamic customer segment based on rules.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="segmentName">Name *</Label>
                <Input
                  id="segmentName"
                  value={newSegment.name}
                  onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                  placeholder="High Spenders"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segmentDescription">Description</Label>
                <Input
                  id="segmentDescription"
                  value={newSegment.description}
                  onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })}
                  placeholder="Customers who spent more than $1000"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Advanced rule configuration coming soon. For now, segments will include all customers.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSegmentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSegment} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CustomerTagging;
