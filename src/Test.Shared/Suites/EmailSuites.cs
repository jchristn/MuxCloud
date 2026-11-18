namespace Test.Shared.Suites
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Linq;
    using System.Threading;
    using System.Threading.Tasks;
    using MuxCloud.Core.Database;
    using MuxCloud.Core.Models;
    using MuxCloud.Core.Settings;
    using MuxCloud.Email;
    using MuxCloud.Email.Templates;
    using Touchstone.Core;

    /// <summary>
    /// Email rendering and the file provider.
    /// </summary>
    public static class EmailSuites
    {
        #region Public-Methods

        /// <summary>
        /// Email suite.
        /// </summary>
        /// <returns>Suite.</returns>
        public static TestSuiteDescriptor Email()
        {
            const string suite = "Email";
            return new TestSuiteDescriptor(suite, "Email", new List<TestCaseDescriptor>
            {
                Cases.Sync(suite, "TemplatesRender", "Every template renders a complete HTML document and a matching text version", () =>
                {
                    EmailService service = new EmailService(TestSettings.Create(new DatabaseSettings()));
                    List<EmailTemplate> templates = new List<EmailTemplate>
                    {
                        new VerifyEmailEmail { FirstName = "Ada", Link = "https://app.usemux.ai/verify?token=evf_x" },
                        new WelcomeEmail { FirstName = "Ada", DashboardUrl = "https://app.usemux.ai/machines" },
                        new PasswordResetEmail { Link = "https://app.usemux.ai/reset?token=pwr_x" },
                        new PasswordChangedEmail { SupportAddress = "hello@latticetech.ai" },
                        new MachineEnrolledEmail { MachineName = "studio <mac>", Os = "macOS", SourceIp = "198.51.100.1", ReviewLink = "https://app.usemux.ai/machines/mch_x" },
                        new MachineRevokedEmail { MachineName = "studio" },
                        new AccountDeletedEmail { SupportAddress = "hello@latticetech.ai" },
                        new AdminTestEmail { NodeId = "node-1", Provider = "file" }
                    };
                    foreach (EmailTemplate template in templates)
                    {
                        EmailRendered rendered = service.Render(template);
                        TestAssert.True(rendered.Html.StartsWith("<!DOCTYPE html>", StringComparison.OrdinalIgnoreCase) || rendered.Html.Contains("<html", StringComparison.OrdinalIgnoreCase), template.Key + " is an HTML document");
                        TestAssert.True(rendered.Html.Contains("color-scheme", StringComparison.Ordinal), template.Key + " supports dark mode");
                        TestAssert.True(rendered.Html.Contains("hello@latticetech.ai", StringComparison.Ordinal), template.Key + " has the support address");
                        TestAssert.True(rendered.Subject.Length > 0 && rendered.Text.Length > 0, template.Key + " has subject and text");
                        TestAssert.True(!rendered.Html.Contains('—') && !rendered.Text.Contains('—') && !rendered.Subject.Contains('—'), template.Key + " has no em-dashes");
                    }

                    EmailRendered verify = service.Render(templates[0]);
                    TestAssert.True(verify.Text.Contains("https://app.usemux.ai/verify?token=evf_x", StringComparison.Ordinal), "text carries the link");
                    EmailRendered enrolled = service.Render(templates[4]);
                    TestAssert.True(enrolled.Html.Contains("studio &lt;mac&gt;", StringComparison.Ordinal) && !enrolled.Html.Contains("studio <mac>", StringComparison.Ordinal), "values are encoded");
                }),
                Cases.Async(suite, "FileProviderWrites", "The file provider writes text and HTML files, and failures never throw", async (CancellationToken token) =>
                {
                    MuxCloudSettings settings = TestSettings.Create(new DatabaseSettings());
                    EmailService service = new EmailService(settings);
                    await service.SendVerificationAsync(new User { Email = "ada@example.com", FirstName = "Ada" }, "https://x.test/verify?token=evf_abc", token).ConfigureAwait(false);
                    string[] files = Directory.GetFiles(settings.Email.File.Directory);
                    TestAssert.Equal(2, files.Length, "two files");
                    string text = File.ReadAllText(files.Single(x => x.EndsWith(".txt", StringComparison.Ordinal)));
                    TestAssert.True(text.Contains("Subject: Confirm your email", StringComparison.Ordinal) && text.Contains("evf_abc", StringComparison.Ordinal), "text file content");
                    bool skipped = await service.SendAsync("", new AdminTestEmail(), token).ConfigureAwait(false);
                    TestAssert.True(!skipped, "blank recipient is skipped");
                    settings.Email.Provider = MuxCloud.Core.Enums.EmailProviderEnum.Mailgun;
                    EmailService unconfigured = new EmailService(settings);
                    TestAssert.True(!await unconfigured.SendTestAsync("ops@example.com", token).ConfigureAwait(false), "unconfigured Mailgun fails quietly");
                    Directory.Delete(settings.Email.File.Directory, true);
                })
            });
        }

        #endregion
    }
}
