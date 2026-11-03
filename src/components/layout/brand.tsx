import Image from "next/image";

export function Brand() {
  return (
    <span className="brand-lockup">
      <Image
        src="/brand/me-studio-mark-v1.png"
        alt=""
        width={42}
        height={42}
        className="brand-image"
        priority
      />
      <strong>me studio</strong>
    </span>
  );
}
