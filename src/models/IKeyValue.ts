export interface IKeyValue {
  key: string;
  value: string | number;
  color?: string;
  icon?: string;
  subtitle?: string;
  action?: () => void;
}

export interface IKeyValueGroup {
  title: string;
  items: IKeyValue[];
  totalLabel?: string;
  total?: number | string;
}
