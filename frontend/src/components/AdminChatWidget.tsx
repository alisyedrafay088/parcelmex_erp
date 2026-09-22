import { chatApi } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { ChatWidgetBase } from "./ChatWidgetBase";

export function AdminChatWidget() {
  const { token } = useAuth();
  return (
    <ChatWidgetBase
      token={token}
      greeting="Hi! I'm your Parcel Mex assistant. Ask me about recent parcels, invoices, or business overview."
      placeholder="Ask about the business..."
      sendMessage={chatApi.streamStaffMessage}
    />
  );
}
