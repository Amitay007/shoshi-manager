import React from "react";
import { Settings } from "@/entities/Settings";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Check } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";
import BackHomeButtons from "@/components/common/BackHomeButtons";

export default function UploadLogo() {
  const [uploading, setUploading] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState("");
  const [settingsId, setSettingsId] = React.useState(null);

  React.useEffect(() => {
    const load = async () => {
      const list = await with429Retry(() => Settings.list());
      if (list && list.length > 0) {
        setLogoUrl(list[0].logo_url || "");
        setSettingsId(list[0].id);
      }
    };
    load();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await UploadFile({ file });
      const url = result?.file_url || "";
      
      if (settingsId) {
        await with429Retry(() => Settings.update(settingsId, { logo_url: url }));
      } else {
        const created = await with429Retry(() => Settings.create({ logo_url: url }));
        setSettingsId(created?.id);
      }
      
      setLogoUrl(url);
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("שגיאה בהעלאת הלוגו");
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-cyan-900">העלאת לוגו</h1>
          <BackHomeButtons />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>לוגו המערכת</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoUrl && (
              <div className="border rounded-lg p-4 bg-white">
                <div className="text-sm text-slate-600 mb-2">לוגו נוכחי:</div>
                <img src={logoUrl} alt="Logo" className="max-h-32 object-contain" />
              </div>
            )}

            <div>
              <label className="block">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                      <span className="text-slate-600">מעלה...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className="text-slate-600">לחץ להעלאת קובץ לוגו</span>
                      <span className="text-xs text-slate-400">PNG, JPG, SVG עד 5MB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>
              </label>
            </div>

            {logoUrl && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                <Check className="w-5 h-5" />
                <span>הלוגו נשמר בהצלחה</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}