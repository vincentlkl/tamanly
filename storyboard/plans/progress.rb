#!/usr/bin/env ruby
# Counts checkboxes and rewrites the progress bars in README.md.
# A module task is done when every box under its "### T" heading is ticked.
# Usage: ruby progress.rb          (rewrites README.md)
#        ruby progress.rb --check  (exits 1 if README.md is out of date)

dir = __dir__
readme_path = File.join(dir, "README.md")
BOX = /^\s*- \[( |x|X)\]/

def bar(done, total, width = 20)
  return "░" * width if total.zero?
  filled = (done * width) / total
  ("█" * filled) + ("░" * (width - filled))
end

def pct(done, total)
  return 0 if total.zero?
  (done * 100) / total
end

files = Dir[File.join(dir, "modules", "*.md")]
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

lines = ["| | Module | Status | Owner | Tasks | Steps |", "|---|---|---|---|---|---|"]
rows.each do |r|
  lines << "| `#{bar(r[:steps_done], r[:steps_total])}` #{pct(r[:steps_done], r[:steps_total])}% | #{r[:link]} | #{r[:status]} | #{r[:owner]} | #{r[:tasks_done]}/#{r[:tasks_total]} | #{r[:steps_done]}/#{r[:steps_total]} |"
end
t = ->(k) { rows.sum { _1[k] } }
lines << "| `#{bar(t[:steps_done], t[:steps_total])}` **#{pct(t[:steps_done], t[:steps_total])}%** | **Total** | | | **#{t[:tasks_done]}/#{t[:tasks_total]}** | **#{t[:steps_done]}/#{t[:steps_total]}** |"

manual_path = File.join(dir, "manual.md")
manual_text = File.read(manual_path)
manual_done = manual_text.scan(/^\s*- \[[xX]\]/).size
manual_total = manual_text.scan(BOX).size
manual = "`#{bar(manual_done, manual_total)}` #{pct(manual_done, manual_total)}% · #{manual_done}/#{manual_total} manual items ticked in [manual.md](manual.md). The human ticks these. The agent does not."

readme = File.read(readme_path)
updated = readme.sub(
  /<!-- progress:start -->.*<!-- progress:end -->/m,
  "<!-- progress:start -->\n#{lines.join("\n")}\n<!-- progress:end -->"
).sub(
  /<!-- manual:start -->.*<!-- manual:end -->/m,
  "<!-- manual:start -->\n#{manual}\n<!-- manual:end -->"
)
abort "progress markers missing from README.md" unless readme.include?("<!-- progress:start -->") && readme.include?("<!-- manual:start -->")

if ARGV.include?("--check")
  exit(updated == readme ? 0 : 1)
else
  File.write(readme_path, updated)
  puts lines
  puts manual
end
