'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { complianceApi, type ComplianceEvaluationResult } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComplianceSummaryProps {
  destinationCountry: string;
  productCategory: string;
  declaredValueUsd: number;
  weightKg: number;
  certifications?: string[];
  rfqId?: string;
  quoteId?: string;
  orderId?: string;
  onAcknowledge?: (acknowledged: boolean) => void;
  showAcknowledgement?: boolean;
}

const COMPLIANCE_LEVEL_CONFIG = {
  low: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    label: 'Low Complexity',
    description: 'Standard documentation required',
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    label: 'Medium Complexity',
    description: 'Additional documentation may be required',
  },
  high: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'High Complexity',
    description: 'Extensive documentation and certifications required',
  },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  'packing-list': 'Packing List',
  'commercial-invoice': 'Commercial Invoice',
  'proforma-invoice': 'Proforma Invoice',
  'bill-of-lading': 'Bill of Lading',
  'phytosanitary-certificate': 'Phytosanitary Certificate',
  'certificate-of-origin': 'Certificate of Origin',
  'organic-certificate': 'Organic Certificate',
  'jas-certificate': 'JAS Certificate',
  'certificate-of-analysis': 'Certificate of Analysis',
  'health-certificate': 'Health Certificate',
  'import-permit': 'Import Permit',
  'fumigation-certificate': 'Fumigation Certificate',
  'insurance-certificate': 'Insurance Certificate',
  'customs-declaration': 'Customs Declaration',
};

export function ComplianceSummary({
  destinationCountry,
  productCategory,
  declaredValueUsd,
  weightKg,
  certifications = [],
  rfqId,
  quoteId,
  orderId,
  onAcknowledge,
  showAcknowledgement = false,
}: ComplianceSummaryProps) {
  const { accessToken } = useAuth();
  const [evaluation, setEvaluation] = useState<ComplianceEvaluationResult | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const fetchCompliance = useCallback(async () => {
    if (!accessToken || !destinationCountry || !productCategory) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await complianceApi.evaluate(accessToken, {
        destinationCountry,
        productCategory,
        declaredValueUsd,
        weightKg,
        certifications,
        rfqId,
        quoteId,
        orderId,
      });
      setEvaluation(result);
    } catch (err) {
      console.error('Failed to evaluate compliance:', err);
      setError('Failed to load compliance information');
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    destinationCountry,
    productCategory,
    declaredValueUsd,
    weightKg,
    certifications,
    rfqId,
    quoteId,
    orderId,
  ]);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  const handleAcknowledge = (value: boolean) => {
    setAcknowledged(value);
    onAcknowledge?.(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">Compliance Summary</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
            <span className="ml-2 text-gray-500">Loading compliance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">Compliance Summary</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchCompliance}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!evaluation) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">Compliance Summary</h2>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            No compliance data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const levelConfig = COMPLIANCE_LEVEL_CONFIG[evaluation.complianceLevel];
  const LevelIcon = levelConfig.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold">Compliance Summary</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCompliance}
            className="text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compliance Level Badge */}
        <div
          className={`p-4 rounded-lg border ${levelConfig.bgColor} ${levelConfig.borderColor}`}
        >
          <div className="flex items-center gap-3">
            <LevelIcon className={`h-6 w-6 ${levelConfig.color}`} />
            <div>
              <p className={`font-medium ${levelConfig.color}`}>
                {levelConfig.label}
              </p>
              <p className="text-sm text-gray-600">{levelConfig.description}</p>
            </div>
          </div>
        </div>

        {/* Required Documents */}
        {evaluation.requiredDocs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Required Documents ({evaluation.requiredDocs.length})
            </h3>
            <ul className="space-y-1">
              {evaluation.requiredDocs.map((doc, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>{DOC_TYPE_LABELS[doc] || doc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Certifications */}
        {evaluation.missingCertifications &&
          evaluation.missingCertifications.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Missing Certifications
              </h3>
              <ul className="space-y-1">
                {evaluation.missingCertifications.map((cert, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-amber-700">
                    <XCircle className="h-3 w-3" />
                    <span>{cert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Warnings */}
        {evaluation.warnings.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </h3>
            <ul className="space-y-1">
              {evaluation.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-yellow-700">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Flags */}
        {evaluation.flags.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Compliance Flags
            </h3>
            <ul className="space-y-1">
              {evaluation.flags.map((flag, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500 italic">{evaluation.disclaimerText}</p>
        </div>

        {/* Acknowledgement Checkbox */}
        {showAcknowledgement && (
          <div className="pt-4 border-t">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => handleAcknowledge(e.target.checked)}
                className="mt-1 rounded"
              />
              <span className="text-sm text-gray-700">
                I acknowledge that I have reviewed the compliance requirements and
                understand my responsibilities as an importer. I confirm that I will
                provide all required documentation before shipment.
              </span>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ComplianceSummary;
