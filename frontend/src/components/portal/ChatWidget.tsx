import { chatApi } from "../../api/chat";
import { useAuth } from "../../context/AuthContext";
import { ChatWidgetBase } from "../ChatWidgetBase";

export function ChatWidget() {
  const { token } = useAuth();
  return (
    <ChatWidgetBase
      token={token}
      greeting="Hi! I'm your Parcel Mex assistant. Ask me about your parcels, delivery status, or invoices."
      placeholder="Ask about your parcels..."
      sendMessage={chatApi.streamMessage}
    />
  );
}
