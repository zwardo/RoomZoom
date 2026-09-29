"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/(standard)/admin/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

function Result({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <Alert variant={result.ok ? "info" : "error"}>
      <p className={result.ok ? "text-foreground" : undefined}>{result.message}</p>
      {result.details.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-xs">
          {result.details.slice(0, 20).map((d) => (
            <li key={d}>{d}</li>
          ))}
          {result.details.length > 20 && <li>…and {result.details.length - 20} more</li>}
        </ul>
      )}
    </Alert>
  );
}

export function CsvImportForm({ id, label, placeholder, action }: { id: string; label: string; placeholder: string; action: Action }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label={label} htmlFor={id}>
        <Textarea id={id} name="csv" placeholder={placeholder} required rows={6} />
      </Field>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Importing…" : "Import"}
        </Button>
      </div>
      <Result result={result} />
    </form>
  );
}

export function HarvestForm({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Scanning your calendar…" : "Collect rooms from my calendar"}
        </Button>
      </div>
      <Result result={result} />
    </form>
  );
}
