#!/usr/bin/env ruby
# Counts checkboxes in modules/m*.md and modules/done/m*.md, then rewrites the progress table in README.md.
# A task is done when every box under its "### T" heading is ticked.
# Usage: ruby progress.rb          (rewrites README.md)
#        ruby progress.rb --check  (exits 1 if README.md is out of date; for CI)

dir = __dir__
readme_path = File.join(dir, "README.md")
BOX = /^\s*- \[( |x|X)\]/

files = Dir[File.join(dir, "modules", "m*.md")] + Dir[File.join(dir, "modules", "done", "m*.md")]
rows = files.sort_by { |path| File.basename(path) }.map do |path|
  text = File.read(path)
  title = text[/^# (.+)$/, 1]
  status = text[/\*\*Status:\*\* ([^·\n]+)/, 1].to_s.strip
  owner = text[/\*\*Owner:\*\* ([^·\n]+)/, 1].to_s.strip

  tasks = []
  current = nil
  text.each_line do |line|
    if line.start_with?("### T")
      current = { done: 0, total: 0 }
      tasks << current
    elsif line.start_with?("## ", "### ")
      current = nil
    elsif current && (m = line.match(BOX))
      current[:total] += 1
      current[:done] += 1 unless m[1] == " "
    end
  end

  steps_done = tasks.sum { _1[:done] }
  steps_total = tasks.sum { _1[:total] }
  tasks_done = tasks.count { _1[:total].positive? && _1[:done] == _1[:total] }
  rel = path.delete_prefix("#{dir}/")
  { link: "[#{title}](#{rel})", status:, owner:,
    tasks_done:, tasks_total: tasks.size, steps_done:, steps_total: }
end

lines = ["| Module | Status | Owner | Tasks done | Steps done |", "|---|---|---|---|---|"]
rows.each do |r|
  lines << "| #{r[:link]} | #{r[:status]} | #{r[:owner]} | #{r[:tasks_done]}/#{r[:tasks_total]} | #{r[:steps_done]}/#{r[:steps_total]} |"
end
t = ->(k) { rows.sum { _1[k] } }
lines << "| **Total** | | | **#{t[:tasks_done]}/#{t[:tasks_total]}** | **#{t[:steps_done]}/#{t[:steps_total]}** |"

readme = File.read(readme_path)
updated = readme.sub(/<!-- progress:start -->.*<!-- progress:end -->/m,
                     "<!-- progress:start -->\n#{lines.join("\n")}\n<!-- progress:end -->")
abort "progress markers missing from README.md" if updated == readme && !readme.include?("<!-- progress:start -->")

if ARGV.include?("--check")
  exit(updated == readme ? 0 : 1)
else
  File.write(readme_path, updated)
  puts lines
end
