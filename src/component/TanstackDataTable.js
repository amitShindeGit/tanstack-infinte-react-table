import React, { useEffect, useRef, useState } from "react";

//3 TanStack Libraries!!!
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

const TanstackDataTableRenderer = ({
  columnData,
  fetchData,
  fetchSize,
  queryKey,
  height,
  rowModel = "default",
  fixedHeader = true,
}) => {
  const tableContainerRef = useRef(null);
  const [sorting, setSorting] = useState([]);

  const lastDivElement = tableContainerRef.current?.lastElementChild;
  const lastTableElement = lastDivElement?.lastElementChild;
  const lastTableRowElement = lastTableElement?.lastElementChild;

  const options = {
    threshold: [0, 1.0],
    trackVisibility: true,
    delay: 100,
  };

  const { data, fetchNextPage, isFetching, isLoading } = useInfiniteQuery({
    queryKey: [queryKey, sorting],
    queryFn: async ({ pageParam = 0 }) => {
      const start = pageParam * fetchSize;
      const delay = (delayInms) => {
        return new Promise((resolve) => setTimeout(resolve, delayInms));
      };

      await delay(3000); //Fake api simulation
      const fetchedData = await fetchData(start, fetchSize, sorting); //callback for fetch api calls
      return fetchedData;
    },
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  //Intersection Observer for infinte scrolling
  const observer = useRef(
    new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && first.isVisible) {
        fetchNextPage();
      }
    }, options)
  );

  useEffect(() => {
    const currentElement = lastTableRowElement;
    const currentObserver = observer.current;
    const lastFetchedData = data?.pages[data?.pages?.length - 1];
    const lastFetchedDataArray = lastFetchedData?.data;

    if (
      currentElement &&
      currentObserver &&
      rowModel === "infinite" &&
      lastFetchedDataArray?.length
    ) {
      currentObserver.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        currentObserver.unobserve(currentElement);
      }
    };
  }, [lastTableRowElement, data?.pages]);

  const columns = React.useMemo(() => columnData, []);

  const flatData = React.useMemo(
    () => data?.pages?.flatMap((page) => page.data) ?? [],
    [data]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    state: {
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    debugTable: true,
  });

  const handleSortingChange = (updater) => {
    setSorting(updater);
    if (!!table.getRowModel().rows.length) {
      rowVirtualizer.scrollToIndex?.(0);
    }
  };

  table.setOptions((prev) => ({
    ...prev,
    onSortingChange: handleSortingChange,
  }));

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 33,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });

  if (isLoading) {
    return <>Loading...</>;
  }

  return (
    <div className="app">
      <div
        className="react-table max-w-full overflow-y-hidden overflow-x-scroll"
        ref={tableContainerRef}
        style={{
          overflow: "auto",
          height: height ?? "100vh",
        }}
      >
        <table className="w-full">
          <thead
            {...{
              className: fixedHeader ? "sticky top-0 z-10 bg-white" : "",
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                style={{ display: "flex", width: "100%" }}
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      style={{
                        display: "flex",
                        width: header.getSize(),
                      }}
                    >
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : "",
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: " ⬆",
                          desc: " ⬇",
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              display: "grid",
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  data-index={virtualRow.index}
                  ref={(node) => rowVirtualizer.measureElement(node)}
                  key={row.id}
                  style={{
                    display: "flex",
                    position: "absolute",
                    transform: `translateY(${virtualRow.start}px)`,
                    width: "100%",
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td
                        key={cell.id}
                        style={{
                          display: "flex",
                          width: cell.column.getSize(),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isFetching && <div>Fetching More...</div>}
    </div>
  );
};

const TanstackDataTable = ({
  columnData,
  fetchData,
  fetchSize,
  queryKey,
  height,
  rowModel = "default",
}) => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TanstackDataTableRenderer
        columnData={columnData}
        fetchData={fetchData}
        fetchSize={fetchSize}
        queryKey={queryKey}
        height={height}
        rowModel={rowModel}
      />
    </QueryClientProvider>
  );
};

export default TanstackDataTable;
