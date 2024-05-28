import { Icons } from "@midday/ui/icons";

type Props = {
  firstName: string;
};

export function ChatEmpty({ firstName }: Props) {
  return (
    <div className="w-full mt-24 flex flex-col items-center justify-center text-center">
      <Icons.LogoSmall />
      <span className="font-medium text-xl mt-4">
        Hi {firstName}, how can I help <br />
        you today?
      </span>
    </div>
  );
}
