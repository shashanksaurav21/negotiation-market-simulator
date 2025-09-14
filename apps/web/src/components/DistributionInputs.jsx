export default function DistributionInputs({ value, onChange, label }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-end">
      <div>
        <label className="block text-sm font-medium">{label} type</label>
        <select
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
          className="mt-1 block w-full border rounded p-2"
        >
          <option value="uniform">uniform</option>
          <option value="normal">normal</option>
          <option value="lognormal">lognormal</option>
        </select>
      </div>

      <div>
        {value.type === "uniform" ? (
          <>
            <label className="block text-sm font-medium">min</label>
            <input
              type="number"
              value={value.params?.min ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  params: {
                    ...(value.params || {}),
                    min: Number(e.target.value),
                  },
                })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </>
        ) : (
          <>
            <label className="block text-sm font-medium">mu</label>
            <input
              type="number"
              value={value.params?.mu ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  params: {
                    ...(value.params || {}),
                    mu: Number(e.target.value),
                  },
                })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </>
        )}
      </div>

      <div>
        {value.type === "uniform" ? (
          <>
            <label className="block text-sm font-medium">max</label>
            <input
              type="number"
              value={value.params?.max ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  params: {
                    ...(value.params || {}),
                    max: Number(e.target.value),
                  },
                })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </>
        ) : (
          <>
            <label className="block text-sm font-medium">sigma</label>
            <input
              type="number"
              value={value.params?.sigma ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  params: {
                    ...(value.params || {}),
                    sigma: Number(e.target.value),
                  },
                })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </>
        )}
      </div>
    </div>
  );
}
