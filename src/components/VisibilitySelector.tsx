import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Lock, Info, Loader2, Music, Mic2, FileText } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Link } from "react-router-dom";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";

export type ContributionType = "original" | "arrangement" | "transcription";

interface VisibilitySelectorProps {
  value: "public" | "private";
  onChange: (value: "public" | "private") => void;
  disabled?: boolean;
  originalCreatorId?: string | null;
  forcePrivate?: boolean;
  contributionType?: ContributionType;
  onContributionTypeChange?: (type: ContributionType) => void;
  theme?: string;
  creatorType?: string | null;
  isCurrentlyPublic?: boolean;
  forcePrivateLocked?: boolean;
  forcePrivateLockedReason?: string;
}

const VisibilitySelector = ({
  value,
  onChange,
  disabled = false,
  originalCreatorId,
  forcePrivate = false,
  contributionType = "transcription",
  onContributionTypeChange,
  theme = "chord_lyric",
  creatorType,
  isCurrentlyPublic = false,
  forcePrivateLocked = false,
  forcePrivateLockedReason,
}: VisibilitySelectorProps) => {
  const { t } = useLanguage();
  const { isUser, isCreator } = useUserRole();
  const { subscriptionStatus, loading: isSubscriptionLoading } =
    useSubscription();

  const isNotOriginalArrangement = !!originalCreatorId || forcePrivate;
  const isCreatorWithoutSubscription =
    isCreator && !subscriptionStatus?.hasActiveSubscription;

  // [!code ++] MODIFIKASI: Kunci opsi Private jika lagu sudah Public
  // Tidak peduli apakah dia Creator atau User biasa, jika sudah Public, tidak bisa balik ke Private
  const isPrivateLocked = isCurrentlyPublic;

  // Cek apakah perlu menampilkan pilihan skema benefit
  const showBenefitSchemeSelector =
    value === "public" &&
    theme !== "chord_grid" &&
    !isNotOriginalArrangement &&
    onContributionTypeChange &&
    creatorType === "creator_professional";

  const handleValueChange = (newValue: string) => {
    if (isCreatorWithoutSubscription && newValue === "public") return;
    if (isUser && newValue === "public") return;
    if (isNotOriginalArrangement && newValue === "public") return;

    // [!code ++] MODIFIKASI: Safeguard di function handler
    if (isPrivateLocked && newValue === "private") return;

    onChange(newValue as "public" | "private");
  };

  const isPublicDisabled =
    disabled ||
    forcePrivateLocked ||
    isUser ||
    isNotOriginalArrangement ||
    (isCreator &&
      (isSubscriptionLoading || !subscriptionStatus?.hasActiveSubscription));

  const publicDisabledReason = () => {
    if (forcePrivateLocked)
      return forcePrivateLockedReason || "A verified creator's public arrangement already exists";
    if (forcePrivate)
      return "Community Library edits are restricted to Private";
    if (isNotOriginalArrangement)
      return "Cannot make copied arrangements public";
    if (isCreatorWithoutSubscription)
      return "Subscription required to make arrangements public";
    if (isUser) return "Upgrade to Creator to make arrangements public";
    return "";
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{t("arrEditor.visibility")}</Label>

      <RadioGroup
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        className="space-y-3"
      >
        {/* Opsi Private */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem
            value="private"
            id="private"
            // [!code ++] Disable tombol jika locked
            disabled={disabled || isPrivateLocked}
            className="mt-1"
          />
          <div
            // [!code ++] Tambahkan opacity visual jika locked
            className={`flex items-center space-x-2 flex-1 ${
              isPrivateLocked ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <Label
              htmlFor="private"
              className={`flex-1 ${
                isPrivateLocked ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <div>
                <div className="font-medium">{t("arrEditor.private")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("arrEditor.descPrivate")}
                </div>
              </div>
            </Label>
          </div>
        </div>

        {/* Opsi Public */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem
            value="public"
            id="public"
            disabled={isPublicDisabled}
            className="mt-1"
          />
          <div className="flex flex-col flex-1 space-y-3">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label
                htmlFor="public"
                className={`flex-1 ${
                  isPublicDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                }`}
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {t("arrEditor.public")}
                    {isCreator && isSubscriptionLoading && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {isPublicDisabled && !isSubscriptionLoading && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{publicDisabledReason()}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isNotOriginalArrangement
                      ? t("arrEditor.notAvailableCopied")
                      : isCreatorWithoutSubscription
                      ? t("arrEditor.availableSubscribedOnly")
                      : isUser
                      ? t("arrEditor.availableCreatorsAdmins")
                      : t("arrEditor.discoverableViewable")}
                  </div>
                </div>
              </Label>
            </div>

            {/* SELEKTOR SKEMA BENEFIT */}
            {showBenefitSchemeSelector && (
              <div className="ml-2 pl-4 border-l-2 border-primary/20 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs font-semibold mb-2 block text-primary">
                  Select Submission Type (Determines Benefit):
                </Label>
                <Select
                  value={contributionType}
                  onValueChange={(val) =>
                    onContributionTypeChange(val as ContributionType)
                  }
                >
                  <SelectTrigger className="w-full text-xs h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original" className="py-3">
                      <div className="flex flex-col items-start text-left">
                        <div className="flex items-center gap-2 font-medium">
                          <Music className="h-4 w-4 text-green-600" />
                          <span>Original Song</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-6 leading-tight">
                          Lagu ciptaan Anda sendiri (lirik & musik orisinal).
                        </span>
                      </div>
                    </SelectItem>

                    <SelectItem value="arrangement" className="py-3">
                      <div className="flex flex-col items-start text-left">
                        <div className="flex items-center gap-2 font-medium">
                          <Mic2 className="h-4 w-4 text-blue-600" />
                          <span>Re-arrangement/Cover</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-6 leading-tight">
                          Lagu orang lain yang Anda aransemen ulang dengan gaya
                          baru.
                        </span>
                      </div>
                    </SelectItem>

                    <SelectItem value="transcription" className="py-3">
                      <div className="flex flex-col items-start text-left">
                        <div className="flex items-center gap-2 font-medium">
                          <FileText className="h-4 w-4 text-orange-600" />
                          <span>Standard Transcription</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-6 leading-tight">
                          Hanya menuliskan ulang chord/lirik dari lagu yang
                          sudah ada.
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">
                  *Please select accurately based on your contribution.
                  <br />
                  Benefit calculation will be adjusted based on the selected
                  type.
                </p>
              </div>
            )}
          </div>
        </div>
      </RadioGroup>

      {/* Catatan User / Subscription */}
      {isUser && !isNotOriginalArrangement && (
        <div className="bg-muted p-3 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <strong>Note:</strong> As a User, you can only create private
            arrangements. Upgrade to Creator to share arrangements publicly.
          </div>
        </div>
      )}

      {isCreatorWithoutSubscription && !isNotOriginalArrangement && !isCapacitorIOS() && (
        <div className="bg-muted p-3 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <strong>Note:</strong> You need an active subscription to publish
            public arrangements.{" "}
            <Link
              to="/pricing"
              className="font-semibold text-primary hover:underline"
            >
              Subscribe now
            </Link>{" "}
            to unlock this feature.
          </div>
        </div>
      )}

      {isNotOriginalArrangement && (
        <div className="bg-muted p-3 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <strong>Note:</strong> This is not your original arrangement, so it
            can only be saved as private.
          </div>
        </div>
      )}

      {/* Warning when visibility is locked due to duplicate detection */}
      {forcePrivateLocked && (
        <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg border-l-4 border-amber-500">
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Visibility Locked:</strong>{" "}
            {forcePrivateLockedReason ||
              "A public arrangement by a verified creator already exists for this song."}
          </div>
        </div>
      )}

      {/* Warning when already public (cannot switch back to private) */}
      {isPrivateLocked && !forcePrivateLocked && (
        <div className="bg-muted p-3 rounded-lg border-l-4 border-yellow-500">
          <div className="text-sm text-muted-foreground">
            <strong>Public Locked:</strong> This arrangement is already public.
            To maintain library consistency, public arrangements cannot be
            switched back to private.
          </div>
        </div>
      )}
    </div>
  );
};

export default VisibilitySelector;
