import React, { useState, useEffect } from 'react';
import {
  TextbookUploadScreenProps,
  TextbookHeader,
  MyTextbooksTab,
  LibraryTextbooksTab,
  ShareEmailModal,
  InspectChunksModal,
  SmartDeduplicationModal,
  TextbookQGroupTab,
  QGroupOwnerModal,
  QGroupAttachModals,
  QGroupActionModals,
  useTextbookQGroup,
  useTextbookDocuments,
} from './textbook';

export type {
  QGroupMessage,
  QGroupPendingRequest,
  QGroup,
  QGroupInvitation,
} from './textbook/types';

export const TextbookUploadScreen: React.FC<TextbookUploadScreenProps> = ({
  onNavigate,
  onShowToast,
  subscriptionInfo,
  currentUser,
  initialTab,
  onOpenPricingModal,
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'library' | 'qgroup'>(() => {
    if (initialTab) return initialTab;
    try {
      const saved = localStorage.getItem('quizgen_textbook_tab');
      if (saved === 'library' || saved === 'qgroup' || saved === 'my') {
        return saved;
      }
    } catch {}
    return 'my';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: 'my' | 'library' | 'qgroup') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('quizgen_textbook_tab', tab);
    } catch {}
  };

  const docState = useTextbookDocuments({
    onNavigate,
    onShowToast,
    subscriptionInfo,
    currentUser,
    onOpenPricingModal,
  });

  const qgroupState = useTextbookQGroup({
    currentUser,
    onShowToast,
  });

  const filteredMyBooks = docState.textbooks.filter((b) =>
    b.name.toLowerCase().includes(docState.searchQuery.toLowerCase())
  );

  const filteredLibraryBooks = docState.libraryTextbooks.filter(
    (b) =>
      b.name.toLowerCase().includes(docState.librarySearchQuery.toLowerCase()) ||
      (b.authorName && b.authorName.toLowerCase().includes(docState.librarySearchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto space-y-4 sm:space-y-6 bg-[#f7f9fb] text-slate-800">
      <TextbookHeader
        isEnterprise={docState.isEnterprise}
        isPro={docState.isPro}
        isLoadingDocuments={docState.isLoadingDocuments}
        onRefresh={() => void docState.fetchDocuments(false)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNavigate={onNavigate}
        myBooksCount={docState.textbooks.length}
        libraryBooksCount={docState.libraryTextbooks.length}
      />

      {activeTab === 'my' && (
        <MyTextbooksTab
          uploadProgressState={docState.uploadProgressState}
          isPro={docState.isPro}
          activeDocsCount={docState.activeDocsCount}
          maxUploadMb={docState.maxUploadMb}
          onShowToast={onShowToast}
          onOpenPricingModal={onOpenPricingModal}
          textbooks={docState.textbooks}
          filteredMyBooks={filteredMyBooks}
          searchQuery={docState.searchQuery}
          setSearchQuery={docState.setSearchQuery}
          isLoadingDocuments={docState.isLoadingDocuments}
          handleUploadFiles={docState.handleUploadFiles}
          handleToggleShare={docState.handleToggleShare}
          setSelectedBookForEmail={docState.setSelectedBookForEmail}
          setIsShareEmailModalOpen={docState.setIsShareEmailModalOpen}
          handleInspectChunks={docState.handleInspectChunks}
          handleUseBook={docState.handleUseBook}
          handleDelete={docState.handleDelete}
          fileInputRef={docState.fileInputRef}
        />
      )}

      {activeTab === 'library' && (
        <LibraryTextbooksTab
          librarySearchQuery={docState.librarySearchQuery}
          setLibrarySearchQuery={docState.setLibrarySearchQuery}
          filteredLibraryBooks={filteredLibraryBooks}
          handleInspectChunks={docState.handleInspectChunks}
          handleUseBook={docState.handleUseBook}
          currentUser={currentUser}
          onStatusChange={(updated) => {
            docState.setTextbooks((prev) =>
              prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
            );
          }}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'qgroup' && (
        <TextbookQGroupTab
          qgroups={qgroupState.qgroups}
          selectedGroupId={qgroupState.selectedGroupId}
          setSelectedGroupId={qgroupState.setSelectedGroupId}
          activeGroup={qgroupState.activeGroup}
          currentUser={currentUser}
          sidebarGroupFilter={qgroupState.sidebarGroupFilter}
          setSidebarGroupFilter={qgroupState.setSidebarGroupFilter}
          groupSearchQuery={qgroupState.groupSearchQuery}
          setGroupSearchQuery={qgroupState.setGroupSearchQuery}
          groupInvitations={qgroupState.groupInvitations}
          isChatSearchOpen={qgroupState.isChatSearchOpen}
          setIsChatSearchOpen={qgroupState.setIsChatSearchOpen}
          chatSearchQuery={qgroupState.chatSearchQuery}
          setChatSearchQuery={qgroupState.setChatSearchQuery}
          isAttachMenuOpen={qgroupState.isAttachMenuOpen}
          setIsAttachMenuOpen={qgroupState.setIsAttachMenuOpen}
          chatInputText={qgroupState.chatInputText}
          setChatInputText={qgroupState.setChatInputText}
          onOpenNewDirectModal={() => qgroupState.setIsNewDirectModalOpen(true)}
          onOpenJoinGroupModal={() => qgroupState.setIsJoinGroupModalOpen(true)}
          onOpenCreateGroupModal={() => qgroupState.setIsCreateGroupModalOpen(true)}
          onOpenGroupSettings={qgroupState.handleOpenGroupSettings}
          onOpenAttachTextbook={() => qgroupState.setIsAttachTextbookModalOpen(true)}
          onOpenAttachExam={() => qgroupState.setIsAttachExamModalOpen(true)}
          onAcceptInvitation={qgroupState.handleAcceptInvitation}
          onDeclineInvitation={qgroupState.handleDeclineInvitation}
          onSendMessage={qgroupState.handleSendMessage}
          onToggleReaction={qgroupState.handleToggleReaction}
          onTogglePinMessage={qgroupState.handleTogglePinMessage}
          onDeleteMessage={qgroupState.handleDeleteMessage}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
        />
      )}

      <QGroupOwnerModal
        isOpen={qgroupState.isOwnerSettingsModalOpen}
        onClose={() => qgroupState.setIsOwnerSettingsModalOpen(false)}
        activeGroup={qgroupState.activeGroup}
        currentUser={currentUser}
        ownerSettingsTab={qgroupState.ownerSettingsTab}
        setOwnerSettingsTab={qgroupState.setOwnerSettingsTab}
        editGroupName={qgroupState.editGroupName}
        setEditGroupName={qgroupState.setEditGroupName}
        editGroupDept={qgroupState.editGroupDept}
        setEditGroupDept={qgroupState.setEditGroupDept}
        editGroupDesc={qgroupState.editGroupDesc}
        setEditGroupDesc={qgroupState.setEditGroupDesc}
        newMemberEmailInput={qgroupState.newMemberEmailInput}
        setNewMemberEmailInput={qgroupState.setNewMemberEmailInput}
        onSaveGroupInfo={qgroupState.handleSaveGroupInfo}
        onAddDirectMember={qgroupState.handleAddDirectMember}
        onStartDirectMessage={qgroupState.handleStartDirectMessage}
        onTransferOwner={qgroupState.handleTransferOwner}
        onKickMember={qgroupState.handleKickMember}
        onUpdatePolicy={qgroupState.handleUpdatePolicy}
        onApproveRequest={qgroupState.handleApproveRequest}
        onRejectRequest={qgroupState.handleRejectRequest}
        onLeaveGroup={qgroupState.handleLeaveGroup}
        onDeleteGroup={qgroupState.handleDeleteGroup}
      />

      <QGroupAttachModals
        isAttachTextbookOpen={qgroupState.isAttachTextbookModalOpen}
        onCloseAttachTextbook={() => qgroupState.setIsAttachTextbookModalOpen(false)}
        textbooks={docState.textbooks}
        onShareTextbook={qgroupState.handleShareTextbookToChat}
        isAttachExamOpen={qgroupState.isAttachExamModalOpen}
        onCloseAttachExam={() => qgroupState.setIsAttachExamModalOpen(false)}
        onShareExam={qgroupState.handleShareExamToChat}
      />

      <QGroupActionModals
        qgroups={qgroupState.qgroups}
        currentUser={currentUser}
        isNewDirectOpen={qgroupState.isNewDirectModalOpen}
        onCloseNewDirect={() => qgroupState.setIsNewDirectModalOpen(false)}
        directPartnerInput={qgroupState.directPartnerInput}
        setDirectPartnerInput={qgroupState.setDirectPartnerInput}
        onStartDirectMessage={qgroupState.handleStartDirectMessage}
        isCreateGroupOpen={qgroupState.isCreateGroupModalOpen}
        onCloseCreateGroup={() => qgroupState.setIsCreateGroupModalOpen(false)}
        newGroupName={qgroupState.newGroupName}
        setNewGroupName={qgroupState.setNewGroupName}
        newGroupDept={qgroupState.newGroupDept}
        setNewGroupDept={qgroupState.setNewGroupDept}
        newGroupDesc={qgroupState.newGroupDesc}
        setNewGroupDesc={qgroupState.setNewGroupDesc}
        newGroupPolicy={qgroupState.newGroupJoinPolicy}
        setNewGroupPolicy={qgroupState.setNewGroupJoinPolicy}
        onCreateGroup={qgroupState.handleCreateQGroup}
        isJoinGroupOpen={qgroupState.isJoinGroupModalOpen}
        onCloseJoinGroup={() => qgroupState.setIsJoinGroupModalOpen(false)}
        joinCodeInput={qgroupState.joinCodeInput}
        setJoinCodeInput={qgroupState.setJoinCodeInput}
        onJoinGroup={qgroupState.handleJoinQGroup}
      />

      <ShareEmailModal
        isOpen={docState.isShareEmailModalOpen}
        selectedBook={docState.selectedBookForEmail}
        onClose={() => docState.setIsShareEmailModalOpen(false)}
        targetColleagueEmail={docState.targetColleagueEmail}
        setTargetColleagueEmail={docState.setTargetColleagueEmail}
        shareEmailMessage={docState.shareEmailMessage}
        setShareEmailMessage={docState.setShareEmailMessage}
        onSubmit={docState.handleSendDirectEmailShare}
      />

      <InspectChunksModal
        inspectingBook={docState.inspectingBook}
        onClose={() => docState.setInspectingBook(null)}
        isFetchingChunks={docState.isFetchingChunks}
        inspectingChunks={docState.inspectingChunks}
      />

      <SmartDeduplicationModal
        isOpen={Boolean(docState.duplicateModalData?.isOpen)}
        duplicateInfo={docState.duplicateModalData}
        onClose={() => docState.setDuplicateModalData(null)}
        onSelectExisting={(doc) => docState.handleUseBook(doc)}
      />
    </div>
  );
};

export default TextbookUploadScreen;
