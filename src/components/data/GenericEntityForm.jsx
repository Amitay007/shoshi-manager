import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GenericEntityForm({ schema, initialData = {}, onSubmit, onCancel, disabled = false }) {
  const [form, setForm] = React.useState(() => ({ ...initialData }));

  React.useEffect(() => {
    setForm({ ...initialData });
  }, [initialData]);

  if (!schema || !schema.properties) {
    return <div className="text-slate-500">אין סכימה זמינה לישות זו.</div>;
  }

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const renderField = (key, def) => {
    const label = def.title || key;
    const type = def.type;

    // Enums
    if (Array.isArray(def.enum) && def.enum.length > 0) {
      return (
        <div key={key} className="space-y-1">
          <div className="text-sm text-slate-600">{label}</div>
          <Select
            value={form[key] ?? ""}
            onValueChange={(v) => handleChange(key, v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר" />
            </SelectTrigger>
            <SelectContent>
              {def.enum.map((v) => (
                <SelectItem key={v} value={String(v)}>{String(v)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Types
    if (type === "boolean") {
      return (
        <div key={key} className="flex items-center gap-2">
          <Checkbox
            checked={!!form[key]}
            onCheckedChange={(v) => handleChange(key, !!v)}
            disabled={disabled}
          />
          <span className="text-sm text-slate-700">{label}</span>
        </div>
      );
    }

    if (type === "number" || type === "integer") {
      return (
        <div key={key} className="space-y-1">
          <div className="text-sm text-slate-600">{label}</div>
          <Input
            type="number"
            value={form[key] ?? ""}
            onChange={(e) => handleChange(key, e.target.value === "" ? undefined : Number(e.target.value))}
            disabled={disabled}
          />
        </div>
      );
    }

    if (type === "string" && def.format === "date") {
      return (
        <div key={key} className="space-y-1">
          <div className="text-sm text-slate-600">{label}</div>
          <Input
            type="date"
            value={form[key] ?? ""}
            onChange={(e) => handleChange(key, e.target.value || undefined)}
            disabled={disabled}
          />
        </div>
      );
    }

    if (type === "array") {
      // arrays of strings -> CSV helper
      if (def.items && def.items.type === "string") {
        const toCsv = (arr) => Array.isArray(arr) ? arr.join(", ") : "";
        const fromCsv = (s) =>
          (s || "")
            .split(",")
            .map((x) => x.trim())
            .filter((x) => x.length > 0);
        return (
          <div key={key} className="space-y-1">
            <div className="text-sm text-slate-600">{label} (מופרד בפסיקים)</div>
            <Input
              value={toCsv(form[key])}
              onChange={(e) => handleChange(key, fromCsv(e.target.value))}
              disabled={disabled}
              placeholder="ערך1, ערך2, ערך3"
            />
          </div>
        );
      }
      // complex arrays -> JSON textarea
      return (
        <div key={key} className="space-y-1">
          <div className="text-sm text-slate-600">{label} (JSON)</div>
          <Textarea
            value={form[key] ? JSON.stringify(form[key], null, 2) : ""}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : undefined;
                handleChange(key, parsed);
              } catch {
                handleChange(key, e.target.value);
              }
            }}
            disabled={disabled}
            className="font-mono"
            placeholder='[{"field":"value"}]'
          />
        </div>
      );
    }

    if (type === "object") {
      return (
        <div key={key} className="space-y-1">
          <div className="text-sm text-slate-600">{label} (JSON)</div>
          <Textarea
            value={form[key] ? JSON.stringify(form[key], null, 2) : ""}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : undefined;
                handleChange(key, parsed);
              } catch {
                handleChange(key, e.target.value);
              }
            }}
            disabled={disabled}
            className="font-mono"
            placeholder='{"field":"value"}'
          />
        </div>
      );
    }

    // default string
    return (
      <div key={key} className="space-y-1">
        <div className="text-sm text-slate-600">{label}</div>
        <Input
          value={form[key] ?? ""}
          onChange={(e) => handleChange(key, e.target.value || undefined)}
          disabled={disabled}
        />
      </div>
    );
  };

  const keys = Object.keys(schema.properties);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {keys.map((k) => renderField(k, schema.properties[k]))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
          ביטול
        </Button>
        <Button type="submit" disabled={disabled}>
          שמור
        </Button>
      </div>
    </form>
  );
}