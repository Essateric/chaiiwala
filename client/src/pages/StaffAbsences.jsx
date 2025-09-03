// src/pages/StaffAbsencePage.jsx
import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import StaffAbsenceFormComponent from '../components/staffAbsence/StaffAbsenceFormComponent.jsx';
import StaffAbsenceList from '../components/staffAbsence/StaffAbsenceList.jsx';
import { useAuth } from '../hooks/UseAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function StaffAbsencePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [profile, setProfile] = useState(null);
  const [stores, setStores] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [saving, setSaving] = useState(false);
  // used to force-reset the form after a successful submission
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const run = async () => {
      if (user?.id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, auth_id, first_name, last_name, email, permissions, store_ids')
          .eq('auth_id', user.id)
          .single();
        setProfile(p || null);
      }
      const { data: s } = await supabase.from('stores').select('id, name').order('name');
      setStores(s || []);
      const { data: a } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setAnnouncements(a || []);
    };
    run();
  }, [user]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const storeIdNum = Number(values.storeId || profile?.store_ids?.[0]);
      const storeName = stores.find((s) => s.id === storeIdNum)?.name || null;
      const payload = {
        staff_name: values.staffName?.trim() || null,
        reporter_name: values.reporterName?.trim() || null,
        reason: values.reason || null,
        reason_other: values.reason === 'Other' ? (values.reasonOther?.trim() || null) : null,
        start_date: values.startDate || null,
        days_absent: values.daysAbsent ? Number(values.daysAbsent) : null,
        notes: values.notes?.trim() || null, // NEW
        store_id: storeIdNum,
        store_name: storeName,
        created_by: profile?.id || null
      };
      const { error } = await supabase.from('staff_absences').insert(payload);
      if (error) throw error;
      toast.success('Staff absence recorded.');
      qc.invalidateQueries({ queryKey: ['staff_absences'] });
      // force a clean form
      setResetKey((k) => k + 1);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save staff absence.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <DashboardLayout title="Staff Absence" profile={profile} announcements={announcements}>
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-chai-gold" />
          <span className="ml-2 text-gray-400">Loading…</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Staff Absence" profile={profile} announcements={announcements}>
      <div className="space-y-6">
        <StaffAbsenceFormComponent
          key={resetKey}              // remounts the form → clears inputs
          profile={profile}
          stores={stores}
          onSubmit={handleSubmit}
          isLoading={saving}
          mode="create"
        />
        <StaffAbsenceList profile={profile} stores={stores} />
      </div>
    </DashboardLayout>
  );
}
