<?php
declare(strict_types=1);

namespace DRCare\Tests\Support;

final class HttpClient
{
    private string $cookieFile;

    public function __construct(
        private readonly string $baseUrl,
        ?string $cookieFile = null,
    ) {
        $this->cookieFile = $cookieFile ?? (sys_get_temp_dir() . '/drcare-cookies-' . uniqid('', true) . '.txt');
    }

    public function get(string $path, array $headers = []): array
    {
        return $this->request('GET', $path, null, $headers);
    }

    public function post(string $path, ?array $body = null, array $headers = []): array
    {
        return $this->request('POST', $path, $body, $headers);
    }

    public function patch(string $path, ?array $body = null, array $headers = []): array
    {
        return $this->request('PATCH', $path, $body, $headers);
    }

    public function delete(string $path, ?array $body = null, array $headers = []): array
    {
        return $this->request('DELETE', $path, $body, $headers);
    }

    public function cookieFile(): string
    {
        return $this->cookieFile;
    }

    public function cleanup(): void
    {
        if (is_file($this->cookieFile)) {
            @unlink($this->cookieFile);
        }
    }

    private function request(string $method, string $path, ?array $body, array $headers): array
    {
        $url = rtrim($this->baseUrl, '/') . $path;
        $ch = curl_init($url);

        $httpHeaders = ['Accept: application/json'];
        foreach ($headers as $key => $value) {
            $httpHeaders[] = $key . ': ' . $value;
        }

        $payload = null;
        if ($body !== null) {
            $payload = json_encode($body, JSON_UNESCAPED_UNICODE);
            $httpHeaders[] = 'Content-Type: application/json';
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $httpHeaders,
            CURLOPT_COOKIEJAR => $this->cookieFile,
            CURLOPT_COOKIEFILE => $this->cookieFile,
            CURLOPT_HEADER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_TIMEOUT => 15,
        ]);

        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        if ($raw === false) {
            throw new \RuntimeException('HTTP request failed: ' . $error);
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $decoded = ['_raw' => $raw];
        }

        return [
            'status' => $status,
            'body' => $decoded,
            'raw' => $raw,
        ];
    }
}
