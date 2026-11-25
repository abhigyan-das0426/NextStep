'use client';

import React, { useState } from 'react';
import { useNextStepSession } from '@/hooks/useNextStepSession';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { ConversationsSidebar } from '@/components/ConversationsSidebar';
import { ChatArea } from '@/components/ChatArea';
import { PlanPanel } from '@/components/PlanPanel';
import { NewPlanModal } from '@/components/NewPlanModal';
import { TimeChangeModal } from '@/components/TimeChangeModal';
import { ApiKeyModal } from '@/components/ApiKeyModal';

export default function Home() {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversationId,
    messages,
    tasks,
    availableMinutes,
    plan,
    isDemoMode,
    activeProvider,
    isLoading,
    error,
    sendMessage,
    retryLastMessage,
    handleTaskComplete,
    handleBreakDown,
    handleUpdateTime,
    resetPlan,
    newConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    checkConfig,
  } = useNextStepSession(user);

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isMobilePlanOpen, setIsMobilePlanOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <Header
        isDemoMode={isDemoMode}
        activeProvider={activeProvider}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenNewPlan={() => setIsNewPlanOpen(true)}
        onToggleMobilePlan={() => setIsMobilePlanOpen(prev => !prev)}
        mobilePlanOpen={isMobilePlanOpen}
        desktopSidebarOpen={isDesktopSidebarOpen}
        onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(prev => !prev)}
        mobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        user={user}
        onLogout={logout}
      />

      {/* Modern 3-Column Layout: Conversations Sidebar (Left), Chat (Center), Day Plan (Right) */}
      <main className="flex-1 flex overflow-hidden relative">
        <ConversationsSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={selectConversation}
          onNewConversation={newConversation}
          onDeleteConversation={deleteConversation}
          onRenameConversation={renameConversation}
          isOpenDesktop={isDesktopSidebarOpen}
          isOpenMobile={isMobileSidebarOpen}
          onCloseDesktop={() => setIsDesktopSidebarOpen(false)}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center Panel: Chatbot Conversation & Quick Action Commands */}
        <div className="flex flex-col h-full flex-1 min-w-0 border-r border-slate-200">
          <ChatArea
            messages={messages}
            isLoading={isLoading}
            error={error}
            activeProvider={activeProvider}
            onSendMessage={sendMessage}
            onRetry={retryLastMessage}
            onSelectStarter={promptText => sendMessage(promptText)}
            onOpenTimeModal={() => setIsTimeModalOpen(true)}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        </div>

        {/* Right Panel: Day Plan Dashboard (Hero Action, Time Budget, Schedule) */}
        <div className="hidden lg:flex flex-col h-full shrink-0 lg:w-[360px] xl:w-[420px] bg-white">
          <PlanPanel
            tasks={tasks}
            plan={plan}
            availableMinutes={availableMinutes}
            onTaskComplete={handleTaskComplete}
            onBreakDown={handleBreakDown}
            onOpenTimeModal={() => setIsTimeModalOpen(true)}
            isOpenMobile={false}
            onCloseMobile={() => setIsMobilePlanOpen(false)}
          />
        </div>

        {/* Mobile Slide-over Plan Panel */}
        <div className="lg:hidden">
          <PlanPanel
            tasks={tasks}
            plan={plan}
            availableMinutes={availableMinutes}
            onTaskComplete={handleTaskComplete}
            onBreakDown={handleBreakDown}
            onOpenTimeModal={() => setIsTimeModalOpen(true)}
            isOpenMobile={isMobilePlanOpen}
            onCloseMobile={() => setIsMobilePlanOpen(false)}
          />
        </div>
      </main>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        activeProvider={activeProvider}
        onKeySaved={checkConfig}
      />

      <NewPlanModal
        isOpen={isNewPlanOpen}
        onClose={() => setIsNewPlanOpen(false)}
        onConfirm={resetPlan}
      />

      <TimeChangeModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        currentTime={availableMinutes}
        onUpdateTime={handleUpdateTime}
      />
    </div>
  );
}
