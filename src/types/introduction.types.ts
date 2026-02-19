export interface IntroductionProps {
  projectLogo?: string;
  projectOverview?: string;
  setProjectOverview?: React.Dispatch<React.SetStateAction<string>>;
  designConstruction?: string;
  setDesignConstruction?: React.Dispatch<React.SetStateAction<string>>;
  designList?: string[];
  setDesignList?: React.Dispatch<React.SetStateAction<string[]>>;
  handleTextChange?: (e: React.ChangeEvent<HTMLTextAreaElement>, setter: React.Dispatch<React.SetStateAction<string>>) => void;
  handleTabKey?: (e: React.KeyboardEvent<HTMLTextAreaElement>, setProjectOverview: React.Dispatch<React.SetStateAction<string>>, setDesignConstruction: React.Dispatch<React.SetStateAction<string>>, projectOverviewRef: React.RefObject<HTMLTextAreaElement>, designConstructionRef: React.RefObject<HTMLTextAreaElement>) => void;
  handleBold?: (e: React.KeyboardEvent<HTMLTextAreaElement>, setProjectOverview: React.Dispatch<React.SetStateAction<string>>, setDesignConstruction: React.Dispatch<React.SetStateAction<string>>, projectOverviewRef: React.RefObject<HTMLTextAreaElement>, designConstructionRef: React.RefObject<HTMLTextAreaElement>) => void;
  handleListChange?: (index: number, value: string) => void;
  addListItem?: () => void;
  removeListItem?: (index: number) => void;
}
