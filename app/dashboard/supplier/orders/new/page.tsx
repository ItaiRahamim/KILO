'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  DollarSign,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SizeConfiguration, PaymentTerm } from '@/types';

interface MixedSizeItem {
  size: string;
  quantity: number;
  price_per_unit: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Product Info
  const [productName, setProductName] = useState('');
  const [variety, setVariety] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [packaging, setPackaging] = useState('');
  const [kgPerBox, setKgPerBox] = useState('');

  // Step 2: Size Configuration
  const [sizeType, setSizeType] = useState<'uniform' | 'mixed'>('uniform');
  const [uniformSize, setUniformSize] = useState('');
  const [uniformQuantity, setUniformQuantity] = useState('');
  const [uniformPrice, setUniformPrice] = useState('');
  const [mixedSizes, setMixedSizes] = useState<MixedSizeItem[]>([
    { size: '', quantity: 0, price_per_unit: 0 },
  ]);

  // Step 3: Payment Terms
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([
    { stage: 'advance', percent: 20, amount: 0 },
    { stage: 'release', percent: 80, amount: 0 },
  ]);

  // Step 4: Shipping Info
  const [portOfLoading, setPortOfLoading] = useState('');
  const [portOfDischarge, setPortOfDischarge] = useState('');

  const steps = [
    { number: 1, title: 'Product', icon: Package },
    { number: 2, title: 'Specifications', icon: FileText },
    { number: 3, title: 'Payment', icon: DollarSign },
    { number: 4, title: 'Review', icon: Check },
  ];

  // Auto-fill from Smart Import (sessionStorage)
  useEffect(() => {
    const draftDataStr = sessionStorage.getItem('draft_order_data');
    if (draftDataStr) {
      try {
        const draftData = JSON.parse(draftDataStr);
        console.log('Loading draft order data:', draftData);

        // Map Product Info from first item
        if (draftData.items && draftData.items.length > 0) {
          const firstItem = draftData.items[0];

          if (firstItem.description) {
            setProductName(firstItem.description);
          }

          if (firstItem.packaging) {
            setPackaging(firstItem.packaging);
          }

          // Calculate kg per box if we have weight and quantity
          if (firstItem.gross_weight && firstItem.quantity) {
            const kgPerBoxCalc = (firstItem.gross_weight / firstItem.quantity).toFixed(2);
            setKgPerBox(kgPerBoxCalc);
          }

          // Set variety/origin if available
          if (firstItem.origin) {
            setVariety(firstItem.origin);
          }

          // Set item code as HS code if available
          if (firstItem.item_code) {
            setHsCode(firstItem.item_code);
          }
        }

        // Map Payment Terms
        if (draftData.payment_terms && Array.isArray(draftData.payment_terms)) {
          const mappedTerms = draftData.payment_terms.map((term: any) => ({
            stage: term.stage || 'other',
            percent: term.percent || 0,
            amount: term.amount || 0,
          }));
          setPaymentTerms(mappedTerms);
        }

        // Map order details if available
        if (draftData.order_details) {
          if (draftData.order_details.product_name) {
            setProductName(draftData.order_details.product_name);
          }
          if (draftData.order_details.port_of_loading) {
            setPortOfLoading(draftData.order_details.port_of_loading);
          }
          if (draftData.order_details.port_of_discharge) {
            setPortOfDischarge(draftData.order_details.port_of_discharge);
          }
        }

        // Show success toast
        toast.success('✨ Order auto-filled from Quote!', {
          description: 'Review and adjust the details as needed',
        });

        // Clear sessionStorage after loading
        sessionStorage.removeItem('draft_order_data');
      } catch (error) {
        console.error('Failed to parse draft order data:', error);
        toast.error('Failed to load draft order data');
        sessionStorage.removeItem('draft_order_data');
      }
    }
  }, []);

  // Add mixed size row
  const addMixedSizeRow = () => {
    setMixedSizes([...mixedSizes, { size: '', quantity: 0, price_per_unit: 0 }]);
  };

  // Remove mixed size row
  const removeMixedSizeRow = (index: number) => {
    if (mixedSizes.length > 1) {
      setMixedSizes(mixedSizes.filter((_, i) => i !== index));
    }
  };

  // Update mixed size row
  const updateMixedSizeRow = (index: number, field: keyof MixedSizeItem, value: string | number) => {
    const updated = [...mixedSizes];
    updated[index] = { ...updated[index], [field]: value };
    setMixedSizes(updated);
  };

  // Add payment term
  const addPaymentTerm = () => {
    setPaymentTerms([...paymentTerms, { stage: 'other', percent: 0, amount: 0 }]);
  };

  // Remove payment term
  const removePaymentTerm = (index: number) => {
    if (paymentTerms.length > 1) {
      setPaymentTerms(paymentTerms.filter((_, i) => i !== index));
    }
  };

  // Update payment term
  const updatePaymentTerm = (index: number, field: keyof PaymentTerm, value: string | number) => {
    const updated = [...paymentTerms];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentTerms(updated);
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalQty = 0;
    let totalAmount = 0;

    if (sizeType === 'uniform') {
      totalQty = Number(uniformQuantity) || 0;
      totalAmount = totalQty * (Number(uniformPrice) || 0);
    } else {
      mixedSizes.forEach((item) => {
        totalQty += item.quantity;
        totalAmount += item.quantity * item.price_per_unit;
      });
    }

    return { totalQty, totalAmount };
  };

  // Validate payment terms
  const validatePaymentTerms = () => {
    const totalPercent = paymentTerms.reduce((sum, term) => sum + (Number(term.percent) || 0), 0);
    return Math.abs(totalPercent - 100) < 0.01; // Allow for floating point errors
  };

  // Validate step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!productName.trim()) {
          toast.error('Product name is required');
          return false;
        }
        return true;
      case 2:
        if (sizeType === 'uniform') {
          if (!uniformSize || !uniformQuantity || !uniformPrice) {
            toast.error('Please fill all size configuration fields');
            return false;
          }
          if (Number(uniformQuantity) <= 0 || Number(uniformPrice) <= 0) {
            toast.error('Quantity and price must be greater than 0');
            return false;
          }
        } else {
          if (mixedSizes.some((item) => !item.size || item.quantity <= 0 || item.price_per_unit <= 0)) {
            toast.error('Please fill all mixed size rows with valid values');
            return false;
          }
        }
        return true;
      case 3:
        if (!validatePaymentTerms()) {
          toast.error('Payment terms must sum to exactly 100%');
          return false;
        }
        if (paymentTerms.some((term) => !term.stage || term.percent <= 0)) {
          toast.error('Please fill all payment terms with valid values');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to create an order');
        return;
      }

      // Get importer (for demo, we'll need to select one - for now use first importer)
      const { data: importers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'importer')
        .limit(1);

      if (!importers || importers.length === 0) {
        toast.error('No importer found. Please contact support.');
        return;
      }

      const { totalQty, totalAmount } = calculateTotals();

      // Build sizes_json
      const sizesJson: SizeConfiguration =
        sizeType === 'uniform'
          ? {
            type: 'uniform',
            size: uniformSize,
            quantity: Number(uniformQuantity),
            price_per_unit: Number(uniformPrice),
          }
          : {
            type: 'mixed',
            items: mixedSizes,
          };

      // Calculate payment amounts
      const paymentTermsWithAmounts = paymentTerms.map((term) => ({
        ...term,
        amount: (totalAmount * term.percent) / 100,
      }));

      // Insert order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          supplier_id: user.id,
          importer_id: importers[0].id,
          product_name: productName,
          variety: variety || null,
          hs_code: hsCode || null,
          packaging: packaging || null,
          kg_per_box: kgPerBox ? Number(kgPerBox) : null,
          sizes_json: sizesJson as any,
          payment_terms_json: paymentTermsWithAmounts as any,
          total_quantity: totalQty,
          total_amount: totalAmount,
          currency: 'USD',
          port_of_loading: portOfLoading || null,
          port_of_discharge: portOfDischarge || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Order created successfully!');
      router.push(`/dashboard/supplier/orders/${order.id}`);
    } catch (error: any) {
      console.error('Error creating order:', error);

      // Show detailed error message
      const errorMessage = error?.message || error?.error_description || 'Failed to create order. Please try again.';
      toast.error(errorMessage);

      // Log additional details for debugging
      if (error?.details) {
        console.error('Error details:', error.details);
      }
      if (error?.hint) {
        console.error('Error hint:', error.hint);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="productName">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="productName"
                placeholder="e.g., Kiwi"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="variety">Variety</Label>
              <Input
                id="variety"
                placeholder="e.g., Hayward"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="packaging">Packaging</Label>
                <Input
                  id="packaging"
                  placeholder="e.g., Carton"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="kgPerBox">Kg per Box</Label>
                <Input
                  id="kgPerBox"
                  type="number"
                  placeholder="e.g., 10"
                  value={kgPerBox}
                  onChange={(e) => setKgPerBox(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="hsCode">HS Code</Label>
              <Input
                id="hsCode"
                placeholder="e.g., 0810.50"
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Harmonized System code for customs
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Size Type Toggle */}
            <div>
              <Label>Size Configuration</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={sizeType === 'uniform' ? 'default' : 'outline'}
                  onClick={() => setSizeType('uniform')}
                  className="flex-1"
                >
                  Uniform Size
                </Button>
                <Button
                  type="button"
                  variant={sizeType === 'mixed' ? 'default' : 'outline'}
                  onClick={() => setSizeType('mixed')}
                  className="flex-1"
                >
                  Mixed Sizes
                </Button>
              </div>
            </div>

            {/* Uniform Size */}
            {sizeType === 'uniform' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="uniformSize">Size</Label>
                    <Input
                      id="uniformSize"
                      placeholder="e.g., 18"
                      value={uniformSize}
                      onChange={(e) => setUniformSize(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="uniformQuantity">Quantity (boxes)</Label>
                    <Input
                      id="uniformQuantity"
                      type="number"
                      placeholder="1000"
                      value={uniformQuantity}
                      onChange={(e) => setUniformQuantity(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="uniformPrice">Price per Box ($)</Label>
                    <Input
                      id="uniformPrice"
                      type="number"
                      step="0.01"
                      placeholder="2.50"
                      value={uniformPrice}
                      onChange={(e) => setUniformPrice(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {uniformQuantity && uniformPrice && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700">
                      Total: {Number(uniformQuantity).toLocaleString()} boxes × $
                      {Number(uniformPrice).toFixed(2)} = $
                      {(Number(uniformQuantity) * Number(uniformPrice)).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mixed Sizes */}
            {sizeType === 'mixed' && (
              <div className="space-y-4">
                {mixedSizes.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Size #{index + 1}
                      </span>
                      {mixedSizes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMixedSizeRow(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor={`size-${index}`}>Size</Label>
                        <Input
                          id={`size-${index}`}
                          placeholder="e.g., 18"
                          value={item.size}
                          onChange={(e) =>
                            updateMixedSizeRow(index, 'size', e.target.value)
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          placeholder="500"
                          value={item.quantity || ''}
                          onChange={(e) =>
                            updateMixedSizeRow(index, 'quantity', Number(e.target.value))
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`price-${index}`}>Price ($)</Label>
                        <Input
                          id={`price-${index}`}
                          type="number"
                          step="0.01"
                          placeholder="2.50"
                          value={item.price_per_unit || ''}
                          onChange={(e) =>
                            updateMixedSizeRow(
                              index,
                              'price_per_unit',
                              Number(e.target.value)
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {item.quantity > 0 && item.price_per_unit > 0 && (
                      <p className="text-xs text-gray-600 mt-2">
                        Subtotal: ${(item.quantity * item.price_per_unit).toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addMixedSizeRow}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Size
                </Button>

                {mixedSizes.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium text-gray-900">
                      Grand Total: {calculateTotals().totalQty.toLocaleString()} boxes
                      = $
                      {calculateTotals().totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        const totalPercent = paymentTerms.reduce(
          (sum, term) => sum + (Number(term.percent) || 0),
          0
        );
        const isValid = Math.abs(totalPercent - 100) < 0.01;

        return (
          <div className="space-y-6">
            <div>
              <Label>Payment Milestones</Label>
              <p className="text-sm text-gray-500 mt-1">
                Define payment stages and percentages (must total 100%)
              </p>
            </div>

            {paymentTerms.map((term, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Payment #{index + 1}
                  </span>
                  {paymentTerms.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePaymentTerm(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`stage-${index}`}>Stage</Label>
                    <Input
                      id={`stage-${index}`}
                      placeholder="e.g., Advance, Release"
                      value={term.stage}
                      onChange={(e) => updatePaymentTerm(index, 'stage', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`percent-${index}`}>Percentage (%)</Label>
                    <Input
                      id={`percent-${index}`}
                      type="number"
                      placeholder="20"
                      value={term.percent || ''}
                      onChange={(e) =>
                        updatePaymentTerm(index, 'percent', Number(e.target.value))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                {term.percent > 0 && calculateTotals().totalAmount > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Amount: $
                    {((calculateTotals().totalAmount * term.percent) / 100).toFixed(2)}
                  </p>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addPaymentTerm}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Stage
            </Button>

            {/* Validation Summary */}
            <div
              className={`p-4 rounded-lg border ${isValid
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Total Percentage:
                </span>
                <Badge variant={isValid ? 'default' : 'secondary'}>
                  {totalPercent.toFixed(1)}%
                </Badge>
              </div>
              {!isValid && (
                <p className="text-xs text-amber-700 mt-2 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Must equal exactly 100%
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        const { totalQty, totalAmount } = calculateTotals();

        return (
          <div className="space-y-6">
            {/* Shipping Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Shipping Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="portOfLoading">Port of Loading</Label>
                  <Input
                    id="portOfLoading"
                    placeholder="e.g., Shanghai"
                    value={portOfLoading}
                    onChange={(e) => setPortOfLoading(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="portOfDischarge">Port of Discharge</Label>
                  <Input
                    id="portOfDischarge"
                    placeholder="e.g., Los Angeles"
                    value={portOfDischarge}
                    onChange={(e) => setPortOfDischarge(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

            </div>

            {/* Order Summary */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product:</span>
                  <span className="font-medium">
                    {productName} {variety && `(${variety})`}
                  </span>
                </div>

                {hsCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">HS Code:</span>
                    <span className="font-medium">{hsCode}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Size Config:</span>
                  <Badge>{sizeType === 'uniform' ? 'Uniform' : 'Mixed'}</Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Total Quantity:</span>
                  <span className="font-medium">{totalQty.toLocaleString()} boxes</span>
                </div>

                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>Total Amount:</span>
                  <span className="text-purple-600">
                    $
                    {totalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Payment Terms:
                  </p>
                  {paymentTerms.map((term, index) => (
                    <div key={index} className="flex justify-between text-sm text-gray-600">
                      <span>
                        {term.stage} ({term.percent}%):
                      </span>
                      <span>${((totalAmount * term.percent) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
        <p className="text-gray-600 mt-1">
          Fill in the details to create your import order
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex-1">
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${isActive
                      ? 'bg-purple-600 text-white'
                      : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                    />
                  )}
                </div>
                <p
                  className={`text-xs mt-2 ${isActive ? 'text-purple-600 font-medium' : 'text-gray-600'
                    }`}
                >
                  {step.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            Step {currentStep}: {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Enter product information'}
            {currentStep === 2 && 'Configure size and pricing details'}
            {currentStep === 3 && 'Set up payment terms'}
            {currentStep === 4 && 'Review and submit your order'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button type="button" onClick={nextStep} className="bg-purple-600 hover:bg-purple-700">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Creating...' : 'Create Order'}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

