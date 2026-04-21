interface CardTagsProps {
  loggedByName?: string;
  showAccount?: boolean;
  accountName?: string;
}

export default function CardTags({
  loggedByName,
  showAccount,
  accountName,
}: CardTagsProps) {
  if (!loggedByName && !(showAccount && accountName)) return null;

  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {loggedByName && (
        <span className="rounded bg-sage/10 px-1.5 py-0.5 text-[10px] text-sage">
          {loggedByName.split(/\s/)[0]}
        </span>
      )}
      {showAccount && accountName && (
        <span className="rounded bg-mist px-1.5 py-0.5 text-[10px] text-ink-light">
          {accountName}
        </span>
      )}
    </div>
  );
}
