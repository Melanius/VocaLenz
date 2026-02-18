import { Instagram, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-background/80">
      <div className="container max-w-screen-2xl flex flex-col sm:flex-row items-center justify-between gap-2 py-4 px-4 text-xs text-muted-foreground">
        <p>
          VocaLenz &middot; Made by <span className="font-medium text-foreground/70">HJ</span>
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com/your_instagram"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Instagram className="h-3.5 w-3.5" />
            Instagram
          </a>
          <a
            href="mailto:your_email@example.com"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
