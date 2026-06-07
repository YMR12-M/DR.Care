<?php
declare(strict_types=1);

namespace DRCare\Tests\Support;

use PDO;

/** Shared PHP built-in server for all integration tests (one instance per PHPUnit run). */
final class TestServer
{
    private static ?self $instance = null;

    private string $dbPath;

    /** @var resource|null */
    private $process = null;

    private function __construct(
        private readonly string $root,
        private readonly int $port,
    ) {
        $this->dbPath = sys_get_temp_dir() . '/drcare-test-' . getmypid() . '.db';
        if (is_file($this->dbPath)) {
            unlink($this->dbPath);
        }
        $this->startProcess();
        $this->waitUntilReady();
        $this->seedAdmin();
    }

    public static function boot(): self
    {
        if (self::$instance === null) {
            $root = dirname(__DIR__, 2);
            $port = 19000 + (getmypid() % 800);
            self::$instance = new self($root, $port);
        }
        return self::$instance;
    }

    public static function shutdown(): void
    {
        if (self::$instance === null) {
            return;
        }
        self::$instance->stopProcess();
        if (is_file(self::$instance->dbPath)) {
            unlink(self::$instance->dbPath);
        }
        self::$instance = null;
    }

    public function baseUrl(): string
    {
        return 'http://127.0.0.1:' . $this->port;
    }

    public function dbPath(): string
    {
        return $this->dbPath;
    }

    private function startProcess(): void
    {
        $cmd = sprintf(
            'DRCARE_SKIP_ENV_FILE=1 DRCARE_DB_PATH=%s DRCARE_DISABLE_RATE_LIMIT=1 POS_TOKEN=%s DRCARE_DEFAULT_ADMIN_AUTO_CREATE=0 php -S 127.0.0.1:%d -t %s 2>/dev/null',
            escapeshellarg($this->dbPath),
            escapeshellarg('test-pos-token-ci'),
            $this->port,
            escapeshellarg($this->root)
        );

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['file', '/dev/null', 'w'],
            2 => ['file', '/dev/null', 'w'],
        ];

        $this->process = proc_open($cmd, $descriptors, $pipes, $this->root);
        if (!is_resource($this->process)) {
            throw new \RuntimeException('Failed to start PHP built-in server for tests');
        }
    }

    private function stopProcess(): void
    {
        if (is_resource($this->process)) {
            proc_terminate($this->process);
            proc_close($this->process);
            $this->process = null;
        }
    }

    private function waitUntilReady(int $attempts = 40): void
    {
        $url = $this->baseUrl() . '/api/health.php';
        for ($i = 0; $i < $attempts; $i++) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 1,
            ]);
            $body = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($status === 200 && str_contains((string) $body, '"ok":true')) {
                return;
            }
            usleep(100_000);
        }
        throw new \RuntimeException('Test server did not become ready at ' . $url);
    }

    private function seedAdmin(): void
    {
        $client = new HttpClient($this->baseUrl());
        $client->get('/api/health.php');

        $pdo = new PDO('sqlite:' . $this->dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $count = (int) $pdo->query('SELECT COUNT(*) FROM admin_users')->fetchColumn();
        if ($count > 0) {
            $client->cleanup();
            return;
        }

        $hash = password_hash('Admin@Test123', PASSWORD_BCRYPT, ['cost' => 4]);
        $stmt = $pdo->prepare(
            'INSERT INTO admin_users (username, email, password_hash, created_at, is_active)
             VALUES (:username, :email, :hash, :now, 1)'
        );
        $stmt->execute([
            ':username' => 'testadmin',
            ':email' => 'admin@test.local',
            ':hash' => $hash,
            ':now' => date('c'),
        ]);

        $client->cleanup();
    }
}
