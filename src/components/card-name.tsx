import type { CSSProperties, ReactNode } from "react";
import { nameCss, nameStyle, type NameStyle } from "@/lib/card-names";

type CardNameProps = {
  card: { code?: string; name: string; faction: string };
  /** lg: the large card; sm: the small card and the album tile. */
  size: "lg" | "sm";
  as?: "h3" | "p";
  className?: string;
};

/** A character's name in its own lettering: paint, outline and a 3D extrusion (see card-names.ts). */
export function CardName({ card, size, as: Tag = "h3", className = "" }: CardNameProps) {
  const style = nameStyle(card);
  return (
    <Tag className={`card-name card-name-${size} ${className}`} style={nameCss(card.name, style)}>
      <span className="card-name-text">
        <span aria-hidden className="card-name-depth">
          {letters(card.name, style)}
        </span>
        <span className={style.jitter ? "card-name-face card-name-face-letters" : "card-name-face"}>
          {letters(card.name, style)}
        </span>
      </span>
    </Tag>
  );
}

/** The name, or one span per letter when the letters move on their own. */
function letters(name: string, style: NameStyle): ReactNode {
  if (!style.jitter) return name;
  const jitter = style.jitter;
  return [...name].map((letter, index) => {
    const [rotation, rise] = jitter[index % jitter.length];
    const transform = { "--nm-letter": `translateY(${-rise}em) rotate(${rotation}deg)` } as CSSProperties;
    return (
      <span key={index} className="card-name-letter" style={transform}>
        {letter === " " ? " " : letter}
      </span>
    );
  });
}
