import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, Brain, Database, Trash2, Play, CheckCircle, XCircle, Clock, Sparkles, Settings } from 'lucide-react';
import { aiTrainingApi, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { TrainingDataset, TrainingSample, AIModelConfig } from '@/types/advanced';

// Mock data
const MOCK_DATASETS: TrainingDataset[] = [
  {
    id: '1',
    name: 'Customer Support Responses',
    description: 'Training data for customer support conversations',
    sampleCount: 1250,
    status: 'completed',
    accuracy: 94.5,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Sales Inquiries',
    description: 'Product questions and sales responses',
    sampleCount: 680,
    status: 'training',
    accuracy: undefined,
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
  },
  {
    id: '3',
    name: 'Order Updates',
    description: 'Shipping and order status messages',
    sampleCount: 320,
    status: 'draft',
    accuracy: undefined,
    createdAt: '2024-01-14T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z',
  },
];

const MOCK_SAMPLES: TrainingSample[] = [
  { id: '1', datasetId: '1', input: 'Where is my order?', expectedOutput: 'I can help you track your order. Could you please provide your order number?', category: 'tracking', isValidated: true, createdAt: '2024-01-10T00:00:00Z' },
  { id: '2', datasetId: '1', input: 'I want a refund', expectedOutput: 'I understand you want a refund. Let me check your order and initiate the refund process for you.', category: 'refund', isValidated: true, createdAt: '2024-01-10T00:00:00Z' },
  { id: '3', datasetId: '1', input: 'Product not working', expectedOutput: 'I apologize for the inconvenience. Can you describe the issue you are facing with the product?', category: 'support', isValidated: false, createdAt: '2024-01-10T00:00:00Z' },
];

const MOCK_CONFIG: AIModelConfig = {
  modelId: 'gpt-4-custom-1',
  name: 'GhostWorker Assistant',
  baseModel: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: 'You are a helpful customer support assistant for an e-commerce platform. Be friendly, professional, and concise in your responses.',
  isActive: true,
  trainedDatasetId: '1',
};

const AITraining = () => {
  const [datasets, setDatasets] = useState<TrainingDataset[]>(MOCK_DATASETS);
  const [samples, setSamples] = useState<TrainingSample[]>(MOCK_SAMPLES);
  const [modelConfig, setModelConfig] = useState<AIModelConfig>(MOCK_CONFIG);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [newDataset, setNewDataset] = useState({ name: '', description: '' });
  const [newSample, setNewSample] = useState({ input: '', expectedOutput: '', category: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [datasetsData, configData] = await Promise.all([
        aiTrainingApi.getDatasets(),
        aiTrainingApi.getModelConfig(),
      ]);
      setDatasets(datasetsData);
      setModelConfig(configData);
    } catch (error) {
      console.error('Failed to fetch AI training data:', error);
      setDatasets(MOCK_DATASETS);
      setModelConfig(MOCK_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSamples = async (datasetId: string) => {
    try {
      const data = await aiTrainingApi.getSamples(datasetId);
      setSamples(data);
    } catch (error) {
      console.error('Failed to fetch samples:', error);
      setSamples(MOCK_SAMPLES.filter(s => s.datasetId === datasetId));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      fetchSamples(selectedDataset);
    }
  }, [selectedDataset]);

  const handleCreateDataset = async () => {
    if (!newDataset.name) {
      toast.error('Please enter a dataset name');
      return;
    }

    setIsLoading(true);
    try {
      await aiTrainingApi.createDataset(newDataset);
      toast.success('Dataset created');
      setCreateDialogOpen(false);
      setNewDataset({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSample = async () => {
    if (!selectedDataset || !newSample.input || !newSample.expectedOutput) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await aiTrainingApi.addSample(selectedDataset, newSample);
      toast.success('Sample added');
      setSampleDialogOpen(false);
      setNewSample({ input: '', expectedOutput: '', category: '' });
      fetchSamples(selectedDataset);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTraining = async (datasetId: string) => {
    try {
      await aiTrainingApi.startTraining(datasetId);
      toast.success('Training started');
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteDataset = async (datasetId: string) => {
    try {
      await aiTrainingApi.deleteDataset(datasetId);
      toast.success('Dataset deleted');
      if (selectedDataset === datasetId) {
        setSelectedDataset(null);
      }
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUpdateConfig = async (updates: Partial<AIModelConfig>) => {
    try {
      await aiTrainingApi.updateModelConfig(updates);
      setModelConfig({ ...modelConfig, ...updates });
      toast.success('Configuration updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'training':
        return <Badge className="bg-warning"><Clock className="h-3 w-3 mr-1 animate-spin" /> Training</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">AI Training</h1>
            <p className="text-muted-foreground">Train and customize your AI assistant</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Dataset
          </Button>
        </div>

        <Tabs defaultValue="datasets">
          <TabsList>
            <TabsTrigger value="datasets">
              <Database className="h-4 w-4 mr-2" />
              Training Datasets
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Model Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datasets" className="space-y-6 mt-6">
            {/* Datasets Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {datasets.map((dataset) => (
                <Card 
                  key={dataset.id} 
                  className={`cursor-pointer transition-all ${selectedDataset === dataset.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedDataset(dataset.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4 text-ghost" />
                          {dataset.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {dataset.description || 'No description'}
                        </CardDescription>
                      </div>
                      {getStatusBadge(dataset.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{dataset.sampleCount} samples</span>
                      {dataset.accuracy && (
                        <span className="font-medium text-success">{dataset.accuracy}% accuracy</span>
                      )}
                    </div>
                    {dataset.status === 'training' && (
                      <Progress value={65} className="mt-3 h-2" />
                    )}
                    <div className="flex gap-2 mt-4">
                      {dataset.status === 'draft' && (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); handleStartTraining(dataset.id); }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Train
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDataset(dataset.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Samples Table */}
            {selectedDataset && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Training Samples</CardTitle>
                      <CardDescription>
                        {datasets.find(d => d.id === selectedDataset)?.name}
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setSampleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sample
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Input</TableHead>
                        <TableHead>Expected Output</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Validated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {samples.map((sample) => (
                        <TableRow key={sample.id}>
                          <TableCell className="max-w-[200px] truncate">{sample.input}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{sample.expectedOutput}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sample.category || 'General'}</Badge>
                          </TableCell>
                          <TableCell>
                            {sample.isValidated ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Model Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-ghost" />
                    Model Settings
                  </CardTitle>
                  <CardDescription>Configure your AI model behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Model Name</Label>
                    <Input
                      value={modelConfig.name}
                      onChange={(e) => handleUpdateConfig({ name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Base Model</Label>
                    <Badge variant="secondary" className="text-sm">{modelConfig.baseModel}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Temperature</Label>
                      <span className="text-sm text-muted-foreground">{modelConfig.temperature}</span>
                    </div>
                    <Slider
                      value={[modelConfig.temperature]}
                      min={0}
                      max={1}
                      step={0.1}
                      onValueChange={([value]) => handleUpdateConfig({ temperature: value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Max Tokens</Label>
                      <span className="text-sm text-muted-foreground">{modelConfig.maxTokens}</span>
                    </div>
                    <Slider
                      value={[modelConfig.maxTokens]}
                      min={100}
                      max={4000}
                      step={100}
                      onValueChange={([value]) => handleUpdateConfig({ maxTokens: value })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active</Label>
                      <p className="text-xs text-muted-foreground">Enable this model for conversations</p>
                    </div>
                    <Switch
                      checked={modelConfig.isActive}
                      onCheckedChange={(checked) => handleUpdateConfig({ isActive: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* System Prompt */}
              <Card>
                <CardHeader>
                  <CardTitle>System Prompt</CardTitle>
                  <CardDescription>Define your AI's personality and behavior</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={modelConfig.systemPrompt}
                    onChange={(e) => handleUpdateConfig({ systemPrompt: e.target.value })}
                    rows={12}
                    placeholder="You are a helpful assistant..."
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This prompt defines how your AI assistant behaves in conversations.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Dataset Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Training Dataset</DialogTitle>
              <DialogDescription>
                Create a new dataset to train your AI model.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Dataset Name *</Label>
                <Input
                  id="name"
                  value={newDataset.name}
                  onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
                  placeholder="Customer Support Responses"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDataset.description}
                  onChange={(e) => setNewDataset({ ...newDataset, description: e.target.value })}
                  placeholder="Training data for..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateDataset} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Sample Dialog */}
        <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Training Sample</DialogTitle>
              <DialogDescription>
                Add a new input-output pair for training.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="input">User Input *</Label>
                <Textarea
                  id="input"
                  value={newSample.input}
                  onChange={(e) => setNewSample({ ...newSample, input: e.target.value })}
                  placeholder="What the user might say..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="output">Expected AI Response *</Label>
                <Textarea
                  id="output"
                  value={newSample.expectedOutput}
                  onChange={(e) => setNewSample({ ...newSample, expectedOutput: e.target.value })}
                  placeholder="How the AI should respond..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newSample.category}
                  onChange={(e) => setNewSample({ ...newSample, category: e.target.value })}
                  placeholder="e.g., refund, tracking, general"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSampleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddSample} disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Sample'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AITraining;
