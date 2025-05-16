import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from "@/components/layout/DashboardLayout"; // Assuming you use this layout
import { Button } from "@/components/ui/button"; // Assuming you use this button component

export default function InviteConfirmation() {

  return (
    <DashboardLayout title="Invitation Sent">
      <div className="p-6 text-center space-y-4">
        <h1 className="text-gray-700">Please check their email inbox (including spam/junk folders) to accept the invitation and set up your password.</h1>
        <h2>You may now close this tab.</h2>
      </div>
    </DashboardLayout>
  );
}