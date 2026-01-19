'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'BUYER' as 'BUYER' | 'SELLER',
    companyName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'SELLER' || roleParam === 'BUYER') {
      setFormData((prev) => ({ ...prev, role: roleParam }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        companyName: formData.companyName || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-matcha-50 to-white px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <span className="text-4xl">🍵</span>
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Join the Matcha Trade marketplace
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'BUYER' | 'SELLER') =>
                  setFormData((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUYER">Buyer</SelectItem>
                  <SelectItem value="SELLER">Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <Input
                id="companyName"
                placeholder="Acme Tea Co."
                value={formData.companyName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    companyName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
              />
              <p className="text-xs text-gray-500">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
