// main/apps/web/src/features/settings/components/ProfileForm.tsx
/**
 * Profile Form Component
 *
 * Form for updating user profile information including name, bio,
 * location, language, and website.
 */

import { Alert, Button, FormField, Input, Text, TextArea } from '@abe-stack/ui';
import { useState, type ReactElement } from 'react';

import { useProfileUpdate } from '../hooks';

// ============================================================================
// Local Types (for ESLint type resolution)
// ============================================================================

interface UserLocal {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null | undefined;
  bio?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  country?: string | null | undefined;
  language?: string | null | undefined;
  website?: string | null | undefined;
}

// ============================================================================
// Types
// ============================================================================

export interface ProfileFormProps {
  user: UserLocal;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ProfileForm = ({ user, onSuccess }: ProfileFormProps): ReactElement => {
  const userFirstName: string = user.firstName ?? '';
  const userLastName: string = user.lastName ?? '';
  const userEmail: string = user.email ?? '';
  const userPhone: string = user.phone ?? '';
  const userBio: string = user.bio ?? '';
  const userCity: string = user.city ?? '';
  const userState: string = user.state ?? '';
  const userCountry: string = user.country ?? '';
  const userLanguage: string = user.language ?? '';
  const userWebsite: string = user.website ?? '';

  const [firstName, setFirstName] = useState(userFirstName);
  const [lastName, setLastName] = useState(userLastName);
  const [phone, setPhone] = useState(userPhone);
  const [bio, setBio] = useState(userBio);
  const [city, setCity] = useState(userCity);
  const [state, setState] = useState(userState);
  const [country, setCountry] = useState(userCountry);
  const [language, setLanguage] = useState(userLanguage);
  const [website, setWebsite] = useState(userWebsite);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalize = (value: string): string => {
    const trimmed = value.trim();
    return trimmed !== '' ? trimmed : '';
  };

  const { updateProfile, isLoading, error, reset } = useProfileUpdate({
    onSuccess: () => {
      setSuccessMessage('Profile updated successfully');
      reset();
      onSuccess?.();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    },
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setSuccessMessage(null);
    const normalizedPhone = normalize(phone);
    const normalizedBio = normalize(bio);
    const normalizedCity = normalize(city);
    const normalizedState = normalize(state);
    const normalizedCountry = normalize(country);
    const normalizedLanguage = normalize(language);
    const normalizedWebsite = normalize(website);
    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone !== '' ? normalizedPhone : null,
      bio: normalizedBio !== '' ? normalizedBio : null,
      city: normalizedCity !== '' ? normalizedCity : null,
      state: normalizedState !== '' ? normalizedState : null,
      country: normalizedCountry !== '' ? normalizedCountry : null,
      language: normalizedLanguage !== '' ? normalizedLanguage : null,
      website: normalizedWebsite !== '' ? normalizedWebsite : null,
    });
  };

  const hasChanges =
    firstName.trim() !== userFirstName ||
    lastName.trim() !== userLastName ||
    normalize(phone) !== userPhone ||
    normalize(bio) !== userBio ||
    normalize(city) !== userCity ||
    normalize(state) !== userState ||
    normalize(country) !== userCountry ||
    normalize(language) !== userLanguage ||
    normalize(website) !== userWebsite;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <FormField label="Email" htmlFor="email">
        <Input id="email" type="email" value={userEmail} disabled className="bg-surface" />
        <Text size="sm" tone="muted" className="mt-1">
          To change your email, go to the Security tab.
        </Text>
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="First Name" htmlFor="firstName">
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
            }}
            placeholder="Enter your first name"
            maxLength={100}
            required
          />
        </FormField>

        <FormField label="Last Name" htmlFor="lastName">
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
            }}
            placeholder="Enter your last name"
            maxLength={100}
            required
          />
        </FormField>
      </div>

      {/* Contact */}
      <FormField label="Phone" htmlFor="phone">
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
          }}
          placeholder="Enter your phone number"
          maxLength={20}
        />
      </FormField>

      {/* About */}
      <FormField label="Bio" htmlFor="bio">
        <TextArea
          id="bio"
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
          }}
          placeholder="Tell us about yourself"
          maxLength={500}
          rows={3}
        />
        <Text size="sm" tone="muted" className="mt-1">
          {String(bio.length)}/500 characters
        </Text>
      </FormField>

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="City" htmlFor="city">
          <Input
            id="city"
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
            }}
            placeholder="City"
            maxLength={100}
          />
        </FormField>

        <FormField label="State / Province" htmlFor="state">
          <Input
            id="state"
            type="text"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
            }}
            placeholder="State / Province"
            maxLength={100}
          />
        </FormField>

        <FormField label="Country" htmlFor="country">
          <Input
            id="country"
            type="text"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
            }}
            placeholder="Country"
            maxLength={100}
          />
        </FormField>
      </div>

      {/* Other */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Language" htmlFor="language">
          <Input
            id="language"
            type="text"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
            }}
            placeholder="Preferred language"
            maxLength={50}
          />
        </FormField>

        <FormField label="Website" htmlFor="website">
          <Input
            id="website"
            type="url"
            value={website}
            onChange={(e) => {
              setWebsite(e.target.value);
            }}
            placeholder="https://example.com"
            maxLength={200}
          />
        </FormField>
      </div>

      {error !== null && <Alert tone="danger">{error.message}</Alert>}

      {successMessage !== null && successMessage.length > 0 && (
        <Alert tone="success">{successMessage}</Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!hasChanges || isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};
