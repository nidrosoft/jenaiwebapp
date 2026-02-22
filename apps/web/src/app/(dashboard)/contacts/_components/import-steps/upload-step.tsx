"use client";

import { FileUploadDropZone } from "@/components/application/file-upload/file-upload-base";
import { CheckCircle, File06 } from "@untitledui/icons";
import type { CsvParseResult } from "../import-contacts-utils";
import { parseCsvFile } from "../import-contacts-utils";

interface UploadStepProps {
  parsed: CsvParseResult | null;
  onParsed: (result: CsvParseResult) => void;
  error: string | null;
  onError: (error: string | null) => void;
}

export function UploadStep({ parsed, onParsed, error, onError }: UploadStepProps) {
  const handleFiles = async (files: FileList) => {
    onError(null);
    const file = files[0];
    if (!file) return;

    try {
      const result = await parseCsvFile(file);
      if (result.rowCount === 0) {
        onError("The CSV file is empty or has no data rows.");
        return;
      }
      if (result.headers.length === 0) {
        onError("Could not detect any column headers in the file.");
        return;
      }
      onParsed(result);
    } catch (err) {
      onError(`Failed to parse file: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">Upload CSV File</h3>
        <p className="mt-1 text-sm text-tertiary">
          Upload a CSV or TSV file exported from your previous contact management tool.
        </p>
      </div>

      <FileUploadDropZone
        accept=".csv,.tsv,text/csv,text/tab-separated-values"
        allowsMultiple={false}
        maxSize={5 * 1024 * 1024}
        hint="CSV or TSV file (max 5 MB)"
        onDropFiles={handleFiles}
        onSizeLimitExceed={() => onError("File is too large. Maximum size is 5 MB.")}
        onDropUnacceptedFiles={() => onError("Only CSV and TSV files are accepted.")}
      />

      {error && (
        <div className="rounded-lg border border-error-secondary bg-error-primary/5 px-4 py-3 text-sm text-error-primary">
          {error}
        </div>
      )}

      {parsed && (
        <div className="flex items-center gap-3 rounded-lg border border-secondary bg-primary px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-secondary">
            <CheckCircle className="h-5 w-5 text-success-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">File parsed successfully</p>
            <p className="text-xs text-tertiary">
              Found <span className="font-semibold">{parsed.rowCount}</span> contacts with{" "}
              <span className="font-semibold">{parsed.headers.length}</span> columns
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
