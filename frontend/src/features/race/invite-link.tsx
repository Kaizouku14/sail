import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Link } from "lucide-react";

interface InviteLinkProps {
  roomId: string;
  inviteLink: string;
}

const InviteLink: React.FC<InviteLinkProps> = ({ roomId, inviteLink }) => {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const copyToClipboard = async (text: string, type: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Do nothing
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-sm font-heading">Share this room</p>

      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={roomId}
          className="font-mono text-sm tracking-wider"
        />
        <Button
          variant="neutral"
          size="icon"
          onClick={() => copyToClipboard(roomId, "code")}
          className="shrink-0"
        >
          {copied === "code" ? (
            <Check className="size-4 text-chart-3" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </div>

      <Button
        variant="neutral"
        size="sm"
        onClick={() => copyToClipboard(inviteLink, "link")}
        className="flex items-center gap-2 w-full"
      >
        {copied === "link" ? (
          <>
            <Check className="size-4 text-chart-3" />
            Link copied!
          </>
        ) : (
          <>
            <Link className="size-4" />
            Copy invite link
          </>
        )}
      </Button>
    </div>
  );
};

export default InviteLink;
