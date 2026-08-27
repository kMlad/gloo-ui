import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addColumn,
  isTableResponse,
  mutationErrorMessage,
  primitiveColumnCreateSchema,
  primitiveColumnTypeSchema,
  tableKeys,
  type ColumnResponse,
  type PrimitiveColumnType,
} from "@/lib/tables";
import { EmailEnrichmentColumnForm } from "@/ui/components/tables/email-enrichment-column-form";
import { EmailValidationColumnForm } from "@/ui/components/tables/email-validation-column-form";
import { SheriffColumnForm } from "@/ui/components/tables/sheriff-column-form";
import { Button } from "@/ui/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/ui/components/ui/drawer";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  MailSearch01Icon,
  MailValidation01Icon,
  Sheriff01Icon,
  TextFontIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

const nativeSelectClass =
  "h-9 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

type AddColumnDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  columns: ColumnResponse[];
};

type DrawerView = "picker" | "regular" | "sheriff" | "email_enrichment" | "email_validation";

export function AddColumnDrawer({ open, onOpenChange, tableId, columns }: AddColumnDrawerProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<DrawerView>("picker");
  const [regularName, setRegularName] = useState("");
  const [regularType, setRegularType] = useState<PrimitiveColumnType>("text");
  const [validationError, setValidationError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (input: Parameters<typeof addColumn>[1]) => addColumn(tableId, input),
    onSuccess: async (result) => {
      if (isTableResponse(result)) {
        queryClient.setQueryData(tableKeys.detail(tableId), result);
      }
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      resetForm();
      onOpenChange(false);
    },
  });

  function resetForm() {
    setView("picker");
    setRegularName("");
    setRegularType("text");
    setValidationError(null);
    create.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && create.isPending) {
      return;
    }
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleRegularSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    create.reset();

    const parsed = primitiveColumnCreateSchema.safeParse({ name: regularName, type: regularType });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid column");
      return;
    }

    create.mutate(parsed.data);
  }

  const error = validationError ?? mutationErrorMessage(create.error, create.isError ? "Failed to add column" : "");

  const title =
    view === "regular"
      ? "Text or boolean"
      : view === "sheriff"
        ? "Sheriff"
        : view === "email_enrichment"
          ? "Find work email"
          : view === "email_validation"
            ? "Verify email"
            : "Add column";
  const description =
    view === "regular"
      ? "Text or boolean. Column type cannot be changed later."
      : view === "sheriff"
        ? "Research the web and write results into output columns."
        : view === "email_enrichment"
          ? "Look up a work email from name, company, and LinkedIn."
          : view === "email_validation"
            ? "Check an existing email column with MillionVerifier."
            : "Choose the kind of column to add.";

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          {view !== "picker" ? (
            <button
              type="button"
              className="mb-1 inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setValidationError(null);
                create.reset();
                setView("picker");
              }}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
              Back
            </button>
          ) : null}
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
          <DrawerClose
            disabled={create.isPending}
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        {view === "picker" ? (
          <>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
              <ColumnTypeOption
                icon={TextFontIcon}
                title="Text or boolean"
                description="A regular column you fill in yourself."
                onClick={() => setView("regular")}
              />
              <ColumnTypeOption
                icon={Sheriff01Icon}
                title="Sheriff"
                description="A research prompt that writes into child columns."
                onClick={() => setView("sheriff")}
              />
              <ColumnTypeOption
                icon={MailSearch01Icon}
                title="Find work email"
                description="Look up a work email from name, company, and LinkedIn."
                onClick={() => setView("email_enrichment")}
              />
              <ColumnTypeOption
                icon={MailValidation01Icon}
                title="Verify email"
                description="Check an existing email column with MillionVerifier."
                onClick={() => setView("email_validation")}
              />
            </div>
            <DrawerFooter className="flex-row justify-end">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </>
        ) : null}

        {view === "regular" ? (
          <form onSubmit={handleRegularSubmit} className="flex min-h-0 flex-1 flex-col">
            <FieldGroup className="flex-1 gap-4 overflow-y-auto p-4">
              <Field>
                <FieldLabel htmlFor="column-name" className="text-xs text-muted-foreground">
                  Name
                </FieldLabel>
                <Input
                  id="column-name"
                  value={regularName}
                  onChange={(event) => setRegularName(event.target.value)}
                  placeholder="Company"
                  required
                  autoFocus
                  className="h-9 rounded-lg px-3 text-sm"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="column-type" className="text-xs text-muted-foreground">
                  Type
                </FieldLabel>
                <div className="relative">
                  <select
                    id="column-type"
                    value={regularType}
                    onChange={(event) => {
                      const parsed = primitiveColumnTypeSchema.safeParse(event.target.value);
                      if (parsed.success) {
                        setRegularType(parsed.data);
                      }
                    }}
                    className={`${nativeSelectClass} w-full`}
                  >
                    <option value="text">Text</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <HugeiconsIcon
                    icon={UnfoldMoreIcon}
                    strokeWidth={2}
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </Field>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </FieldGroup>
            <DrawerFooter className="flex-row justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={create.isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Adding…" : "Add column"}
              </Button>
            </DrawerFooter>
          </form>
        ) : null}

        {view === "sheriff" ? (
          <SheriffColumnForm
            tableId={tableId}
            columns={columns}
            pending={create.isPending}
            error={mutationErrorMessage(create.error, create.isError ? "Failed to add column" : "")}
            submitLabel="Add column"
            pendingLabel="Adding…"
            onCancel={() => handleOpenChange(false)}
            onSubmit={(input) => {
              setValidationError(null);
              create.reset();
              create.mutate({
                name: input.name,
                type: "sheriff",
                sheriff: input.sheriff,
              });
            }}
          />
        ) : null}

        {view === "email_enrichment" ? (
          <EmailEnrichmentColumnForm
            columns={columns}
            pending={create.isPending}
            error={mutationErrorMessage(create.error, create.isError ? "Failed to add column" : "")}
            submitLabel="Add column"
            pendingLabel="Adding…"
            onCancel={() => handleOpenChange(false)}
            onSubmit={(input) => {
              setValidationError(null);
              create.reset();
              create.mutate({
                name: input.name,
                type: "email_enrichment",
                email_enrichment: input.email_enrichment,
              });
            }}
          />
        ) : null}

        {view === "email_validation" ? (
          <EmailValidationColumnForm
            columns={columns}
            pending={create.isPending}
            error={mutationErrorMessage(create.error, create.isError ? "Failed to add column" : "")}
            submitLabel="Add column"
            pendingLabel="Adding…"
            onCancel={() => handleOpenChange(false)}
            onSubmit={(input) => {
              setValidationError(null);
              create.reset();
              create.mutate({
                name: input.name,
                type: "email_validation",
                email_validation: input.email_validation,
              });
            }}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function ColumnTypeOption({
  icon,
  title,
  description,
  onClick,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-border/70 bg-background p-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
