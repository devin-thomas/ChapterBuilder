import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const FolderIcon = (props: IconProps) => <IconBase {...props}><path d="M3 6.5h6l2 2h10v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 10h18" /></IconBase>;
export const DownloadIcon = (props: IconProps) => <IconBase {...props}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></IconBase>;
export const PlusIcon = (props: IconProps) => <IconBase {...props}><path d="M12 5v14M5 12h14" /></IconBase>;
export const TrashIcon = (props: IconProps) => <IconBase {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></IconBase>;
export const EditIcon = (props: IconProps) => <IconBase {...props}><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z" /><path d="m14 7 3 3" /></IconBase>;
export const CopyIcon = (props: IconProps) => <IconBase {...props}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></IconBase>;
export const ArrowUpIcon = (props: IconProps) => <IconBase {...props}><path d="m7 11 5-5 5 5M12 6v12" /></IconBase>;
export const ArrowDownIcon = (props: IconProps) => <IconBase {...props}><path d="m7 13 5 5 5-5M12 18V6" /></IconBase>;
export const SwapIcon = (props: IconProps) => <IconBase {...props}><path d="M7 7h13l-3-3M17 17H4l3 3" /></IconBase>;
export const VideoIcon = (props: IconProps) => <IconBase {...props}><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m17 10 4-2v8l-4-2" /></IconBase>;
export const CheckIcon = (props: IconProps) => <IconBase {...props}><path d="m5 12 4 4L19 6" /></IconBase>;
export const AlertIcon = (props: IconProps) => <IconBase {...props}><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v4M12 17h.01" /></IconBase>;
export const ResetIcon = (props: IconProps) => <IconBase {...props}><path d="M4 4v6h6" /><path d="M5.5 16a8 8 0 1 0 .5-9.5L4 10" /></IconBase>;
