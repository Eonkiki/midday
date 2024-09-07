import { ChartSelectors } from "@/components/charts/chart-selectors";
import { Charts } from "@/components/charts/charts";
import { EmptyState } from "@/components/charts/empty-state";
import { OverviewModal } from "@/components/modals/overview-modal";
import { Widgets } from "@/components/widgets";
import { Cookies } from "@/utils/constants";
import {
  getTeamBankAccounts,
  getTeamSettings,
} from "@midday/supabase/cached-queries";
import { cn } from "@midday/ui/cn";
import { startOfMonth, startOfYear, subMonths } from "date-fns";
import type { Metadata } from "next";
import { cookies } from "next/headers";

// NOTE: GoCardLess serverAction needs this currently
// (Fetch accounts takes up to 20s and default limit is 15s)
export const maxDuration = 30;

export const metadata: Metadata = {
  title: "Overview | Midday",
};

const defaultValue = {
  from: subMonths(startOfMonth(new Date()), 12).toISOString(),
  to: new Date().toISOString(),
  period: "monthly",
};

export default async function Overview({ searchParams }) {
  const accounts = await getTeamBankAccounts();
  const chartType = cookies().get(Cookies.ChartType)?.value ?? "profit";

  const hideConnectFlow = cookies().has(Cookies.HideConnectFlow);

  const currency = cookies().has(Cookies.ChartCurrency)
    ? cookies().get(Cookies.ChartCurrency)?.value
    : (await getTeamSettings())?.data?.base_currency;

  const initialPeriod = cookies().has(Cookies.SpendingPeriod)
    ? JSON.parse(cookies().get(Cookies.SpendingPeriod)?.value)
    : {
        id: "this_year",
        from: startOfYear(new Date()).toISOString(),
        to: new Date().toISOString(),
      };

  const value = {
    ...(searchParams.from && { from: searchParams.from }),
    ...(searchParams.to && { to: searchParams.to }),
    period: searchParams.period,
  };

  const isEmpty = !accounts?.data?.length;

  return (
    <>
      <div>
        <div className="h-[530px] mb-4">
          <ChartSelectors defaultValue={defaultValue} currency={currency} />

          <div className="mt-8 relative">
            {isEmpty && <EmptyState />}

            <div className={cn(isEmpty && "blur-[8px] opacity-20")}>
              <Charts
                value={value}
                defaultValue={defaultValue}
                disabled={isEmpty}
                currency={currency}
                type={chartType}
              />
            </div>
          </div>
        </div>

        <Widgets
          initialPeriod={initialPeriod}
          disabled={isEmpty}
          searchParams={searchParams}
        />
      </div>

      <OverviewModal defaultOpen={isEmpty && !hideConnectFlow} />
    </>
  );
}
