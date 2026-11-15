// STATIC: no hooks from features/*, no API calls. Any network request fails the test on purpose.
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTES } from '@/config/routes';

const PROBLEMS = [
  ['Delayed supervision, human error', 'Automatic reminders and escalation when a review is overdue. Every action is timestamped and dashboards show what needs attention.'],
  ['Lack of transparency', 'Weekly logbooks with feedback, a visible placement approval timeline, and results released only through the system.'],
  ['High cost of supervisor transport', 'Academic supervisors follow students, read logbooks, record visits and assessments remotely. Physical visits become targeted.'],
  ['Visits interfering with the intern’s work', 'Visits are scheduled and logged in the system, and most oversight needs no visit at all.'],
  ['Cheating and inflated hours', 'Hours count only after the workplace supervisor verifies them. Missing weeks, duplicate text and outliers are flagged automatically.'],
];

const ROLES: [string, string, string[]][] = [
  ['student', 'Student', ['Submit your host organisation and track approval.', 'Write a weekly logbook with daily lines and photos.', 'Upload your final report and read your released result.']],
  ['industrial', 'Industrial supervisor', ['Approve weekly entries, adjusting hours where needed.', 'Evaluate your interns using the official form.']],
  ['academic', 'Academic supervisor', ['Follow your students from your dashboard.', 'Schedule and record visits, review reports and assess.']],
  ['coordinator', 'Coordinator', ['Approve placements and assign supervisors.', 'Post notices, monitor progress and release results.']],
];

const FEATURES = [
  ['Placement approval', 'Students propose, the coordinator decides and assigns supervisors.'],
  ['Weekly logbook', 'Daily lines, optional images and supervisor feedback in one place.'],
  ['Remote supervision', 'Visits and oversight without unnecessary travel.'],
  ['Rubric assessment', 'Evaluation forms built from the institution’s official rubric.'],
  ['Role dashboards', 'Each user sees exactly what needs action now.'],
];

const FAQ = [
  ['Who can create an account?', 'Accounts are created by the coordinator. There is no public sign-up. You will receive an email to set your password.'],
  ['Which hours count?', 'Only hours approved by your workplace supervisor count towards the required total.'],
  ['When do I see my result?', 'After the coordinator finalizes it. Results are never visible earlier.'],
];

export default function LandingPage() {
  return (
    <div className="text-base">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <span className="text-lg font-semibold">SIAMS</span>
          <nav aria-label="Primary">
            <Button asChild>
              <Link to={ROUTES.login as string}>Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-5xl space-y-4 px-4 py-16 text-center">
          <h1 className="text-5xl font-semibold lg:text-6xl">Student Internship and Attachment Management</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            One system for placements, weekly logbooks, supervision, assessment and results. Transparent for students, efficient for supervisors.
          </p>
          <Button asChild size="lg">
            <Link to={ROUTES.login as string}>Get started</Link>
          </Button>
        </section>

        <section className="mx-auto max-w-5xl space-y-6 px-4 py-12" aria-labelledby="problems">
          <h2 id="problems" className="text-3xl font-semibold">Five problems, solved</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map(([t, d]) => (
              <Card key={t}>
                <CardHeader>
                  <CardTitle className="text-lg">{t}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{d}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl space-y-6 px-4 py-12" aria-labelledby="roles">
          <h2 id="roles" className="text-3xl font-semibold">How it works</h2>
          <Tabs defaultValue="student">
            <TabsList>
              {ROLES.map(([v, l]) => (
                <TabsTrigger key={v} value={v}>
                  {l}
                </TabsTrigger>
              ))}
            </TabsList>
            {ROLES.map(([v, l, steps]) => (
              <TabsContent key={v} value={v}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{l}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc space-y-1 pl-5">
                      {steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        <section className="mx-auto max-w-5xl space-y-6 px-4 py-12" aria-labelledby="features">
          <h2 id="features" className="text-3xl font-semibold">Features</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([t, d]) => (
              <Card key={t}>
                <CardHeader>
                  <CardTitle className="text-lg">{t}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{d}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-6 px-4 py-12" aria-labelledby="faq">
          <h2 id="faq" className="text-3xl font-semibold">Frequently asked questions</h2>
          <Accordion type="single" collapsible>
            {FAQ.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent>{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <Separator />
      <footer className="mx-auto max-w-5xl p-6 text-center text-sm text-muted-foreground">SIAMS · Student Internship and Attachment Management System</footer>
    </div>
  );
}
