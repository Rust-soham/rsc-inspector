export function ClientShellDetails({ expanded }: { readonly expanded: boolean }) {
  return (
    <p>
      This unmarked module is a client descendant. Slot state: {expanded ? "open" : "closed"}.
    </p>
  )
}
