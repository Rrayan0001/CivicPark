type RouteLoadingProps = {
  variant?: 'mobile' | 'dashboard' | 'public'
}

export function RouteLoading({ variant = 'mobile' }: RouteLoadingProps) {
  if (variant === 'dashboard') {
    return (
      <main className="route-loading route-loading-dashboard" aria-label="Loading page">
        <section className="route-loading-sidebar">
          <div className="skeleton route-loading-mark" />
          <div className="skeleton route-loading-line is-wide" />
          <div className="skeleton route-loading-line" />
          <div className="route-loading-spacer" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton route-loading-nav-row" key={index} />
          ))}
        </section>
        <section className="route-loading-panel">
          <div className="skeleton route-loading-title" />
          <div className="skeleton route-loading-subtitle" />
          <div className="route-loading-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="skeleton route-loading-card" key={index} />
            ))}
          </div>
          <div className="skeleton route-loading-table" />
        </section>
      </main>
    )
  }

  if (variant === 'public') {
    return (
      <main className="route-loading route-loading-public" aria-label="Loading page">
        <div className="skeleton route-loading-line is-short" />
        <div className="skeleton route-loading-hero" />
        <div className="route-loading-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="skeleton route-loading-card" key={index} />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="route-loading route-loading-mobile" aria-label="Loading page">
      <div className="route-loading-mobile-header">
        <div>
          <div className="skeleton route-loading-title" />
          <div className="skeleton route-loading-subtitle" />
        </div>
        <div className="skeleton route-loading-pill" />
      </div>
      <div className="route-loading-stack">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="route-loading-list-row" key={index}>
            <div className="skeleton route-loading-thumb" />
            <div className="route-loading-list-copy">
              <div className="skeleton route-loading-line is-wide" />
              <div className="skeleton route-loading-line" />
              <div className="skeleton route-loading-line is-short" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
